#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <SDL_net.h>

#include "api.h"
#include "d_player.h"
#include "m_menu.h"
#include "../d_event.h"
#include "../doomkeys.h"
#include "p_local.h"
#include "cJSON.h"

extern  player_t  players[MAXPLAYERS];
extern void P_KillMobj( mobj_t* source, mobj_t* target );

extern int    numsectors;
extern sector_t*  sectors;
extern int      numlines;
extern line_t*      lines;

int consoleplayer = 0;
TCPsocket server_sd;
TCPsocket client_sd;
SDLNet_SocketSet set;
char player_message[512];

#define NUMKEYS   256
int  gamekeydown[NUMKEYS];

void API_AfterTic();
boolean API_RouteRequest(char *first_line, char *body);
void API_SendTextResponse(int status, char *body);
void API_SendResponse(int status, cJSON *root);
void API_SendHttpNotFound();
int API_GetMobjTypeFromString(char *s);
mobj_t *API_FindObjectById(long id);
cJSON* API_DescribeMObj(mobj_t*);
char* API_GetMobjTypeName(mobj_t *mo);
float API_FixedToFloat(fixed_t fixed);
fixed_t API_FloatToFixed(float val);
int API_GetInternalTypeIdFromDoomEdNum(int nbr);
boolean API_IsLineADoor(line_t *line);
cJSON* API_DescribeDoor(int id, line_t *line);

int angleToDegrees(angle_t angle) 
{
    return ((double)angle / ANG_MAX) * 360;
}

angle_t degreesToAngle(int degrees) {
    return ((float)degrees / 360) * ANG_MAX;
}

void API_Init(int port)
{
    printf("hello\n");
    IPaddress ip;
    if (SDLNet_Init() < 0)
    {
        fprintf(stderr, "SDLNet_Init: %s\n", SDLNet_GetError());
        exit(EXIT_FAILURE);
    }
    if (SDLNet_ResolveHost(&ip, NULL, port) < 0)
    {
        fprintf(stderr, "SDLNet_ResolveHost: %s\n", SDLNet_GetError());
        exit(EXIT_FAILURE);
    }
    if (!(server_sd = SDLNet_TCP_Open(&ip)))
    {
        fprintf(stderr, "SDLNet_TCP_Open: %s\n", SDLNet_GetError());
        exit(EXIT_FAILURE);
    }
    if (!(set = SDLNet_AllocSocketSet(10)))
    {
        fprintf(stderr, "SDLNet_AllocSocketSet: %s\n", SDLNet_GetError());
        exit(EXIT_FAILURE); 
    }
    printf("server: %d\n", server_sd);

    for (int i = 0; i < NUMKEYS; i++) {
        gamekeydown[i] = -1;
    }
}

void API_RunIO()
{
    TCPsocket csd;
    int recv_len = 0;
    char buffer[1024];

    if ((csd = SDLNet_TCP_Accept(server_sd)))
    {
        client_sd = csd;
        printf("accept\n");
        SDLNet_TCP_AddSocket(set, client_sd);
    }

    if (SDLNet_CheckSockets(set, 0) > 0)
    {
        recv_len = SDLNet_TCP_Recv(client_sd, buffer, 1024);
        if (recv_len > 0)
        {
            buffer[recv_len] = 0;  //-1 to chop off last
            int pos = strstr(buffer, "\r\n") - buffer;
            char first_line[512];
            first_line[pos] = 0;
            strncpy(first_line, buffer, pos);
            int pos2 = (strstr(buffer, "\r\n\r\n") - buffer) + 4;
            char body[512];
            strcpy(body, &buffer[pos2]);

            API_RouteRequest(first_line, body);

            SDLNet_TCP_DelSocket(set, client_sd);
            SDLNet_TCP_Close(client_sd);
        }
    }
}

// ----
//  HTTP method handlers
// ----

boolean API_PostMessage(cJSON *req)
{
    memset(player_message, 0, 512);
    sprintf(player_message, "%s", cJSON_GetObjectItem(req, "text")->valuestring);
    players[consoleplayer].message = player_message;
    API_SendTextResponse(201, "");
    return true;
}

boolean API_PostPlayerAction(cJSON *req)
{
    char *type = cJSON_GetObjectItem(req, "type")->valuestring;
    if (strcmp(type, "forward") == 0)
    {
        gamekeydown[KEY_UPARROW] = 20;
        event_t event;
        event.type = ev_keydown;
        event.data1 = KEY_UPARROW;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else if (strcmp(type, "backward") == 0)
    {
        gamekeydown[KEY_DOWNARROW] = 20;
        event_t event;
        event.type = ev_keydown;
        event.data1 = KEY_DOWNARROW;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else if (strcmp(type, "turn-left") == 0) {
        gamekeydown[KEY_LEFTARROW] = 10;
        event_t event;
        event.type = ev_keydown;
        event.data1 = KEY_LEFTARROW;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else if (strcmp(type, "turn-right") == 0) {
        gamekeydown[KEY_RIGHTARROW] = 10;
        event_t event;
        event.type = ev_keydown;
        event.data1 = KEY_RIGHTARROW;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else if (strcmp(type, "shoot") == 0)
    {
        gamekeydown[KEY_RCTRL] = 40;
        event_t event;
        event.type = ev_keydown;
        event.data1 = KEY_RCTRL;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else {
        API_SendTextResponse(400, "invalid type");
        return false;
    }
    API_SendTextResponse(201, "");
    return true;
}

boolean API_GetPlayer()
{
    player_t *player = &players[consoleplayer];
    cJSON *root = API_DescribeMObj(player->mo);
    cJSON_AddNumberToObject(root, "armor", player->armorpoints);
    cJSON_AddNumberToObject(root, "kills", player->killcount);
    cJSON_AddNumberToObject(root, "items", player->itemcount);
    cJSON_AddNumberToObject(root, "secrets", players->secretcount);
    cJSON_AddNumberToObject(root, "weapon", player->readyweapon);
    cJSON *cheats = cJSON_CreateObject();
    if (player->cheats & CF_NOCLIP) cJSON_AddTrueToObject(cheats, "CF_NOCLIP");
    if (player->cheats & CF_GODMODE) cJSON_AddTrueToObject(cheats, "CF_GODMODE");
    cJSON_AddItemToObject(root, "cheatFlags", cheats);
    API_SendResponse(200, root);
    cJSON_Delete(root);
    return false;
}

boolean API_PatchPlayer(cJSON *req)
{
    player_t *player = &players[consoleplayer];
    cJSON *prop = cJSON_GetObjectItem(req, "weapon");
    if (prop)
    {
        int weapon = prop->valueint;
        if (!player->weaponowned[weapon]) {
            API_SendTextResponse(400, "player does not have this weapon");
            return false;
        }
        player->pendingweapon = weapon;
    }
    prop = cJSON_GetObjectItem(req, "armor");
    if (prop)
    {
        player->armorpoints = prop->valueint;
    }
    return API_GetPlayer();
}

boolean API_PostWorldObjects(cJSON *req)
{
    mobj_t *pobj = players[consoleplayer].mo;
    fixed_t angle = pobj->angle >> ANGLETOFINESHIFT;
    fixed_t x, y;
    int dist = 9990048;
    x = pobj->x + FixedMul(dist, finecosine[angle]); 
    y = pobj->y + FixedMul(dist, finesine[angle]);

    int typeId = cJSON_GetObjectItem(req, "type")->valueint;
    int typeNbr = API_GetInternalTypeIdFromDoomEdNum(typeId);
    if (typeNbr == -1)
    {
        API_SendTextResponse(400, "typeId not found\n");
        return false;
    }

    mobj_t *mobj = P_SpawnMobj(x, y, ONCEILINGZ, typeNbr);
    // if (mobj->info->seestate != S_NULL && P_LookForPlayers (mobj, true))
    // {
    //     P_SetMobjState (mobj, mobj->info->seestate);
    // }
    cJSON *root = API_DescribeMObj(mobj);
    API_SendResponse(201, root);
    return true;
}

boolean API_GetWorldObjects()
{
    cJSON *root = cJSON_CreateArray();
    mobj_t *t;
    for (int i = 0; i < numsectors; i++) {
        t = sectors[i].thinglist;
        while (t)
        {
            cJSON *objJson = API_DescribeMObj(t);
            cJSON_AddItemToArray(root, objJson);
            t = t->snext;
        }
    }
    API_SendResponse(200, root);
    cJSON_Delete(root);
    return true;
}

boolean API_PatchWorldObject(int id, cJSON *req)
{
    mobj_t *obj = API_FindObjectById(id);
    if (!obj)
    {
        API_SendHttpNotFound();
        return false;
    }
    cJSON *pos = cJSON_GetObjectItem(req, "position");
    if (pos) {
        P_UnsetThingPosition(obj);
        cJSON *val = cJSON_GetObjectItem(pos, "x");
        if (val) obj->x = API_FloatToFixed(val->valuedouble);
        
        val = cJSON_GetObjectItem(pos, "y");
        if (val) obj->y = API_FloatToFixed(val->valuedouble);
        
        val = cJSON_GetObjectItem(pos, "z");
        if (val) obj->z = API_FloatToFixed(val->valuedouble);
        
        P_SetThingPosition(obj);
    }
    cJSON *val = cJSON_GetObjectItem(req, "angle");
    if (val) obj->angle = degreesToAngle(val->valueint);

    val = cJSON_GetObjectItem(req, "health");
    if (val) obj->health = val->valueint;

    cJSON* root = API_DescribeMObj(obj);
    API_SendResponse(200, root);
    cJSON_Delete(root);
    return true;
}

boolean API_DeleteWorldObject(int id)
{
    mobj_t *obj = API_FindObjectById(id);
    if (!obj)
    {
        API_SendHttpNotFound();
        return false;
    }
    P_KillMobj(NULL, obj);
    API_SendTextResponse(204, "");
    return true;
}

boolean API_GetWorldObject(int id)
{
    mobj_t *obj = API_FindObjectById(id);
    if (!obj)
    {
        API_SendHttpNotFound();
        return false;
    }
    cJSON* root = API_DescribeMObj(obj);
    API_SendResponse(200, root);
    cJSON_Delete(root);
    return true;
}

boolean API_GetWorldDoors()
{
    int sectorIds[512];
    int sectorCount = 0;
    cJSON *root = cJSON_CreateArray();
    cJSON *door;

    for (int i = 0; i < numlines; i++)
    {
        line_t *line = &lines[i];
        sector_t *sec = sides[ line->sidenum[1]].sector;
        int seenSector = 0;
        for (int j = 0; j < sectorCount; j++)
        {
            if (sectorIds[j] == sec->id)
            {
                seenSector = 1;
                break;
            }
        }
        if (seenSector || !API_IsLineADoor(line))
        {
            continue;
        }
        
        door = API_DescribeDoor(i, line);
        cJSON_AddItemToArray(root, API_DescribeDoor(i, line));
        sectorIds[sectorCount++] = sec->id;
    }
    API_SendResponse(200, root);
    cJSON_Delete(root);
    return true;
}

boolean API_GetWorldDoor(int id)
{
    if (!API_IsLineADoor(&lines[id]))
    {
        API_SendTextResponse(400, "This id is not a valid door id");
        return false;
    }
    cJSON *door = API_DescribeDoor(id, &lines[id]);
    API_SendResponse(200, door);
    cJSON_Delete(door);
    return true;
}

boolean API_PatchWorldDoor(int id, cJSON *req)
{
    if (!API_IsLineADoor(&lines[id]))
    {
        API_SendTextResponse(400, "This id is not a valid door id");
        return false;
    }
    cJSON *state = cJSON_GetObjectItem(req, "state");
    if (state)
    {
        sector_t *sec = sides[lines[id].sidenum[1]].sector;                
        if ((strcmp(state->valuestring, "open") == 0 && sec->floorheight == sec->ceilingheight) ||
            (strcmp(state->valuestring, "closed") == 0 && sec->floorheight != sec->ceilingheight))
        {
            EV_VerticalDoor(&lines[id], players[consoleplayer].mo);
        }
    }
    cJSON *door = API_DescribeDoor(id, &lines[id]);
    API_SendResponse(200, door);
    cJSON_Delete(door);
    return true;
}

// ----
//  Route an http path + method to an action
// ----
boolean API_RouteRequest(char *first_line, char *body) 
{
    char method[20];
    char path[100];
    char proto[10];
    cJSON *json = cJSON_Parse(body);
    sscanf(first_line, "%s%s%s", method, path, proto);
    if (strcmp(path, "/api/message") == 0)
    {
        if (strcmp(method, "POST") == 0)
        {
            return API_PostMessage(json);
        }        
    }
    if (strcmp(path, "/api/player/actions") == 0)
    {
        if (strcmp(method, "POST") == 0)
        {
            return API_PostPlayerAction(json);
        }
    }
    if (strcmp(path, "/api/player") == 0) 
    {
        if (strcmp(method, "PATCH") == 0) 
        {
            return API_PatchPlayer(json);
        }
        else if (strcmp(method, "GET") == 0)
        {
            return API_GetPlayer();
        }
    }
    else if (strcmp(path, "/api/world/objects") == 0)
    {
        if (strcmp(method, "POST") == 0) 
        {
            return API_PostWorldObjects(json);
        }
        else if (strcmp(method, "GET") == 0)
        {
            return API_GetWorldObjects();
        }
    }
    else if (strncmp(path, "/api/world/objects/", 19) == 0) {
        int id;
        sscanf(path, "/api/world/objects/%d/", &id);
        if (strcmp(method, "DELETE") == 0)
        {
            return API_DeleteWorldObject(id);
        }
        else if (strcmp(method, "GET") == 0)
        {
            return API_GetWorldObject(id);
        }
        else if (strcmp(method, "PATCH") == 0)
        {
            return API_PatchWorldObject(id, json);
        }
    }
    else if (strncmp(path, "/api/world/doors", 16) == 0)
    {
        if (strlen(path) > 17)  //specifc door path
        {
            int id;
            sscanf(path, "/api/world/doors/%d", &id);
            if (strcmp(method, "PATCH") == 0)
            {
                return API_PatchWorldDoor(id, json);
            }
            else if (strcmp(method, "GET") == 0)
            {
                return API_GetWorldDoor(id);
            }
        }
        else
        {
            return API_GetWorldDoors();
        }
    }

    API_SendHttpNotFound();
    return false;
}

boolean API_IsLineADoor(line_t *line) 
{
    switch (line->special) 
    {
        case 1:        // Vertical Door
        case 26:      // Blue Door/Locked
        case 27:      // Yellow Door /Locked
        case 28:      // Red Door /Locked
        case 31:      // Manual door open
        case 32:      // Blue locked door open
        case 33:      // Red locked door open
        case 34:      // Yellow locked door open
        case 117:     // Blazing door raise
        case 118:     // Blazing door open
            return true;
        default:
            return false;
    }
}

cJSON* API_DescribeDoor(int id, line_t *line)
{
    sector_t *sec = sides[line->sidenum[1]].sector;
    cJSON *door = cJSON_CreateObject();
    cJSON_AddNumberToObject(door, "id", id);
    cJSON_AddNumberToObject(door, "specialType", line->special);
    cJSON_AddNumberToObject(door, "sec", sec->id);
    cJSON_AddStringToObject(door, "state", sec->floorheight == sec->ceilingheight ? "closed" : "open");
    return door;
}

cJSON* API_DescribeMObj(mobj_t *obj)
{
    cJSON *root = cJSON_CreateObject();
    cJSON *pos;
    cJSON_AddNumberToObject(root, "id", obj->id);
    cJSON_AddItemToObject(root, "position", pos = cJSON_CreateObject());
    cJSON_AddNumberToObject(pos, "x", API_FixedToFloat(obj->x));
    cJSON_AddNumberToObject(pos, "y", API_FixedToFloat(obj->y));
    cJSON_AddNumberToObject(pos, "z", API_FixedToFloat(obj->z));
    cJSON_AddNumberToObject(root, "angle", angleToDegrees(obj->angle));
    cJSON_AddNumberToObject(root, "height", API_FixedToFloat(obj->height));
    cJSON_AddNumberToObject(root, "health", obj->health);
    cJSON_AddNumberToObject(root, "type", mobjinfo[obj->type].doomednum);

    cJSON *flags = cJSON_CreateObject();
    if (obj->flags & MF_SPECIAL) cJSON_AddTrueToObject(flags, "MF_SPECIAL");
    if (obj->flags & MF_SOLID) cJSON_AddTrueToObject(flags, "MF_SOLID");
    if (obj->flags & MF_SHOOTABLE) cJSON_AddTrueToObject(flags, "MF_SHOOTABLE");
    if (obj->flags & MF_NOSECTOR) cJSON_AddTrueToObject(flags, "MF_NOSECTOR");
    if (obj->flags & MF_NOBLOCKMAP) cJSON_AddTrueToObject(flags, "MF_NOBLOCKMAP");
    if (obj->flags & MF_AMBUSH) cJSON_AddTrueToObject(flags, "MF_AMBUSH");
    if (obj->flags & MF_JUSTHIT) cJSON_AddTrueToObject(flags, "MF_JUSTHIT");
    if (obj->flags & MF_JUSTATTACKED) cJSON_AddTrueToObject(flags, "MF_JUSTATTACKED");
    if (obj->flags & MF_SPAWNCEILING) cJSON_AddTrueToObject(flags, "MF_SPAWNCEILING");
    if (obj->flags & MF_NOGRAVITY) cJSON_AddTrueToObject(flags, "MF_NOGRAVITY");
    if (obj->flags & MF_DROPOFF) cJSON_AddTrueToObject(flags, "MF_DROPOFF");
    if (obj->flags & MF_PICKUP) cJSON_AddTrueToObject(flags, "MF_PICKUP");
    if (obj->flags & MF_NOCLIP) cJSON_AddTrueToObject(flags, "MF_NOCLIP");
    if (obj->flags & MF_SLIDE) cJSON_AddTrueToObject(flags, "MF_SLIDE");
    if (obj->flags & MF_FLOAT) cJSON_AddTrueToObject(flags, "MF_FLOAT");
    if (obj->flags & MF_TELEPORT) cJSON_AddTrueToObject(flags, "MF_TELEPORT");
    if (obj->flags & MF_MISSILE) cJSON_AddTrueToObject(flags, "MF_MISSILE");
    if (obj->flags & MF_DROPPED) cJSON_AddTrueToObject(flags, "MF_DROPPED");
    if (obj->flags & MF_SHADOW) cJSON_AddTrueToObject(flags, "MF_SHADOW");
    if (obj->flags & MF_NOBLOOD) cJSON_AddTrueToObject(flags, "MF_NOBLOOD");
    if (obj->flags & MF_CORPSE) cJSON_AddTrueToObject(flags, "MF_CORPSE");
    if (obj->flags & MF_INFLOAT) cJSON_AddTrueToObject(flags, "MF_INFLOAT");
    if (obj->flags & MF_COUNTKILL) cJSON_AddTrueToObject(flags, "MF_COUNTKILL");
    if (obj->flags & MF_COUNTITEM) cJSON_AddTrueToObject(flags, "MF_COUNTITEM");
    if (obj->flags & MF_SKULLFLY) cJSON_AddTrueToObject(flags, "MF_SKULLFLY");
    if (obj->flags & MF_NOTDMATCH) cJSON_AddTrueToObject(flags, "MF_NOTDMATCH");
    if (obj->flags & MF_TRANSLATION) cJSON_AddTrueToObject(flags, "MF_TRANSLATION");

    cJSON_AddItemToObject(root, "flags", flags);
    return root;
}

float API_FixedToFloat(fixed_t fixed) {
    double val = fixed;
    double ex = 1<<16;
    return val / ex;
}

fixed_t API_FloatToFixed(float val) {
    return (int)(val * (1<<16));
}

int API_GetInternalTypeIdFromDoomEdNum(int nbr)
{
    for (int i = 0; i < NUMMOBJTYPES; i++)
    {
        if (mobjinfo[i].doomednum == nbr)
        {
            return i;
        }
    }
    return -1;    
}

mobj_t *API_FindObjectById(long id) 
{
    mobj_t *t;
    for (int i = 0; i < numsectors; i++) {
        t = sectors[i].thinglist;
        while (t)
        {
            if (t->id == id) {
                return t;
            }
            t = t->snext;    
        }
    }
    return NULL;
}
            

int API_GetMobjTypeFromString(char *s) {
    if (strcmp(s, "MT_TROOP") == 0) {
        return MT_TROOP;
    }
    else if (strcmp(s, "MT_POSSESSED") == 0) {
        return MT_POSSESSED;
    }
    else if (strcmp(s, "MT_SHOTGUY") == 0) {
        return MT_SHOTGUY;
    }
    else if (strcmp(s, "MT_SERGEANT") == 0) {
        return MT_SERGEANT;
    }
    else if (strcmp(s, "MT_HEAD") == 0) {
        return MT_HEAD;
    }
    else if (strcmp(s, "MT_BRUISER") == 0) {
        return MT_BRUISER;
    }
    else {
        return MT_BARREL;
    }
}

char* API_GetMobjTypeName(mobj_t *mo) {
    return "";
}


void API_SendTextResponse(int status, char *body) {
    char buffer[1024];
    sprintf(buffer, "HTTP/1.0 %d\r\nConnection: close\r\nContent-Type:text/plain\r\n\r\n%s", status, body);
    int len = strlen(buffer);
    if (SDLNet_TCP_Send(client_sd, (void *)buffer, len) < len) {
        printf("failed to send all bytes\n");
    }
}

void API_SendResponse(int status, cJSON *root) {
    char buffer[255];
    sprintf(buffer, "HTTP/1.0 %d\r\nConnection: close\r\nContent-Type:application/json\r\n\r\n", status);
    int len = strlen(buffer);
    if (SDLNet_TCP_Send(client_sd, (void *)buffer, len) < len) {
        printf("failed to send all bytes\n");
    }
    char *jsonToString = cJSON_Print(root);
    len = strlen(jsonToString);
    if (SDLNet_TCP_Send(client_sd, (void *)jsonToString, len) < len) {
        printf("failed to send all bytes\n");
    }
    free(jsonToString);
}

void API_SendHttpNotFound() {
    char buffer[] = "HTTP/1.0 404 Not Found\r\nConnection: close\r\n\r\n";
    int len = strlen(buffer);
    if (SDLNet_TCP_Send(client_sd, (void *)buffer, len) < len) {
        printf("failed to send all bytes\n");
    }
}


void API_AfterTic() {

    for (int i = 0; i < NUMKEYS; i++) {
        if (gamekeydown[i] >= 0) {
            gamekeydown[i]--;
        }
        if (gamekeydown[i] == 0) {
            event_t event;
            event.type = ev_keyup;
            event.data1 = i;
            event.data2 = 0;
            D_PostEvent(&event);
        }
    }
}