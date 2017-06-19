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
#include "api_cJSON.h"
#include "api_player_controller.h"
#include "api_world_controller.h"

extern int    numsectors;
extern sector_t*  sectors;
extern int      numlines;
extern line_t*      lines;

TCPsocket server_sd;
TCPsocket client_sd;
SDLNet_SocketSet set;

void API_AfterTic();
api_response_t API_RouteRequest(char *method, char *path, char *body);
void API_SendResponse(api_response_t resp);

void API_Init(int port)
{
    IPaddress ip;
    if (SDLNet_Init() < 0)
    {
        fprintf(stderr, "Error: SDLNet_Init: %s\n", SDLNet_GetError());
        exit(EXIT_FAILURE);
    }
    if (SDLNet_ResolveHost(&ip, NULL, port) < 0)
    {
        fprintf(stderr, "Error: SDLNet_ResolveHost: %s\n", SDLNet_GetError());
        exit(EXIT_FAILURE);
    }

    if (!(server_sd = SDLNet_TCP_Open(&ip)))
    {
        fprintf(stderr, "Error: SDLNet_TCP_Open: %s\n", SDLNet_GetError());
        exit(EXIT_FAILURE);
    }
    if (!(set = SDLNet_AllocSocketSet(10)))
    {
        fprintf(stderr, "Error: SDLNet_AllocSocketSet: %s\n", SDLNet_GetError());
        exit(EXIT_FAILURE); 
    }

    for (int i = 0; i < NUMKEYS; i++) {
        keys_down[i] = -1;
    }

    const char *host = SDLNet_ResolveIP(&ip);
    printf("API_Init: Listening for connections on %s:%d\n", host, port);
}

void API_RunIO()
{
    TCPsocket csd;
    int recv_len = 0;
    char buffer[1024];

    if ((csd = SDLNet_TCP_Accept(server_sd)))
    {
        client_sd = csd;
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

            char method[20];
            char path[100];
            char protocol[10];
            api_response_t response;
            int ret = sscanf(first_line, "%s%s%s", method, path, protocol);
            if (ret != 3) {
                response = API_CreateErrorResponse(400, "invalid request");
            }
            else {
                response = API_RouteRequest(method, path, body);    
            }

            API_SendResponse(response);

            // IPaddress *remote_ip;
            // remote_ip = SDLNet_TCP_GetPeerAddress(client_sd);

            // access log
            printf("access_log: 127.0.0.1 - - - \"%s %s\" %d\n", method, path, response.status_code);

            SDLNet_TCP_DelSocket(set, client_sd);
            SDLNet_TCP_Close(client_sd);
        }
    }
}


// ----
//  Route an http path + method to an action
// ----
api_response_t API_RouteRequest(char *method, char *path, char *body) 
{
    cJSON *json = cJSON_Parse(body);
    
    if (strcmp(path, "/api/message") == 0)
    {
        if (strcmp(method, "POST") == 0)
        {
            return API_PostMessage(json);
        }     
    }
    else if (strcmp(path, "/api/player") == 0) 
    {
        if (strcmp(method, "PATCH") == 0) 
        {
            return API_PatchPlayer(json);
        }
        else if (strcmp(method, "GET") == 0)
        {
            return API_GetPlayer();
        }
        else if (strcmp(method, "DELETE") == 0) {
            return API_DeletePlayer();
        }
    }
    else if (strcmp(path, "/api/player/actions") == 0)
    {
        if (strcmp(method, "POST") == 0)
        {
            return API_PostPlayerAction(json);
        }
    }
    else if (strcmp(path, "/api/world") == 0) {
        if (strcmp(method, "GET") == 0) {
            return API_GetWorld();
        }
        else if (strcmp(method, "PATCH") == 0) {
            return API_PatchWorld(json);
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
    else if (strstr(path, "/api/world/objects/") != NULL) {
        int id;
        if (sscanf(path, "/api/world/objects/%d", &id) != 1) {
            return API_CreateErrorResponse(404, "path not found");
        }
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
    else if (strcmp(path, "/api/world/doors") == 0) {
        if (strcmp(method, "GET") == 0)
        {
            return API_GetWorldDoors();
        }
    }
    else if (strstr(path, "/api/world/doors") != NULL)
    {
        int id;
        if (sscanf(path, "/api/world/doors/%d", &id) != 1) {
            return API_CreateErrorResponse(404, "path not found");
        }
        if (strcmp(method, "PATCH") == 0)
        {
            return API_PatchWorldDoor(id, json);
        }
        else if (strcmp(method, "GET") == 0)
        {
            return API_GetWorldDoor(id);
        }
    }
    return API_CreateErrorResponse(404, "Not found");
}

void API_SendResponse(api_response_t resp) {
    char buffer[255];
    sprintf(buffer, "HTTP/1.0 %d\r\nConnection: close\r\nContent-Type:application/json\r\n\r\n", resp.status_code);
    int len = strlen(buffer);
    if (SDLNet_TCP_Send(client_sd, (void *)buffer, len) < len) {
        printf("failed to send all bytes\n");
    }
    char *jsonToString = cJSON_Print(resp.json);
    len = strlen(jsonToString);
    if (SDLNet_TCP_Send(client_sd, (void *)jsonToString, len) < len) {
        printf("failed to send all bytes\n");
    }
    free(jsonToString);
    cJSON_Delete(resp.json);
}

api_response_t API_CreateErrorResponse(int status, char *message) {
  cJSON *body = cJSON_CreateObject();
  cJSON_AddStringToObject(body, "error", message);
  return (api_response_t) { status, body };
}

void API_AfterTic() {

    for (int i = 0; i < NUMKEYS; i++) {
        if (keys_down[i] >= 0) {
            keys_down[i]--;
        }
        if (keys_down[i] == 0) {
            event_t event;
            event.type = ev_keyup;
            event.data1 = i;
            event.data2 = 0;
            D_PostEvent(&event);
        }
    }
}

// Helper methods

float API_FixedToFloat(fixed_t fixed) {
    double val = fixed;
    double ex = 1<<16;
    return val / ex;
}

fixed_t API_FloatToFixed(float val) {
    return (int)(val * (1<<16));
}

int angleToDegrees(angle_t angle) 
{
    return ((double)angle / ANG_MAX) * 360;
}

cJSON* DescribeMObj(mobj_t *obj)
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