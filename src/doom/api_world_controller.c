#include "api_world_controller.h"

#include "d_player.h"
#include "p_local.h"
#include "g_game.h"

#define CONSOLE_PLAYER 0

// externally-defined game variables
extern player_t         players[MAXPLAYERS];
extern  skill_t         gameskill;
extern int              gameepisode;
extern int              gamemap;
extern void             P_KillMobj( mobj_t* source, mobj_t* target );

angle_t degreesToAngle(int degrees) {
    return ((float)degrees / 360) * ANG_MAX;
}

boolean IsLineADoor(line_t *line) 
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

cJSON* DescribeDoor(int id, line_t *line)
{
    sector_t *sec = sides[line->sidenum[1]].sector;
    cJSON *door = cJSON_CreateObject();
    cJSON_AddNumberToObject(door, "id", id);
    cJSON_AddNumberToObject(door, "specialType", line->special);
    cJSON_AddNumberToObject(door, "sec", sec->id);
    cJSON_AddStringToObject(door, "state", sec->floorheight == sec->ceilingheight ? "closed" : "open");
    char *key_color = "none";
    switch (line->special) {
        case 26:
        case 32:
            key_color = "blue";
            break;
        case 27:
        case 34:
            key_color = "yellow";
        case 28:
        case 33:
            key_color = "red";
            break;
    }
    //if (key_color != NULL) {
        cJSON_AddStringToObject(door, "key", key_color);
    //}
    return door;
}


int GetInternalTypeIdFromDoomEdNum(int nbr)
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

mobj_t *FindObjectById(long id) 
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
            

int GetMobjTypeFromString(char *s) {
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

char* GetMobjTypeName(mobj_t *mo) {
    return "";
}

cJSON *DescribeWorldState() {
  cJSON *root = cJSON_CreateObject();
  cJSON_AddNumberToObject(root, "episode", gameepisode);
  cJSON_AddNumberToObject(root, "map", gamemap);

  sector_t *sector = players[CONSOLE_PLAYER].mo->subsector->sector;
  cJSON_AddStringToObject(root, "lights", sector->lightlevel == 75 ? "off" : "on");
  return root;
}


// Controller methods

api_response_t API_GetWorld(cJSON *req) {
  return (api_response_t) { 200, DescribeWorldState() };
}

api_response_t API_PatchWorld(cJSON *req) {
  cJSON *val = cJSON_GetObjectItem(req, "episode");
  boolean changed = false;
  if (val) {
    gameepisode = val->valueint;
    changed = true;
  }
  val = cJSON_GetObjectItem(req, "map");
  if (val) {
    gamemap = val->valueint;
    changed = true;
  }
  if (changed) {
    G_DeferedInitNew (gameskill, gameepisode, gamemap);
  }

  val = cJSON_GetObjectItem(req, "lights");
  if (val) {
    if (strcmp(val->valuestring, "on") == 0) {
        struct line_s *line = players[CONSOLE_PLAYER].mo->subsector->sector->lines[0];
        EV_LightTurnOn(line, 255);
    }
    else {
        struct line_s *line = players[CONSOLE_PLAYER].mo->subsector->sector->lines[0];
        EV_LightTurnOn(line, 75);
    }
  }
  return (api_response_t) { 200, DescribeWorldState() };
}

api_response_t API_PostWorldObjects(cJSON *req)
{
    mobj_t *pobj = players[CONSOLE_PLAYER].mo;
    fixed_t angle = pobj->angle >> ANGLETOFINESHIFT;
    fixed_t x, y;

    cJSON *val = cJSON_GetObjectItem(req, "distance");
    int dist = API_FloatToFixed(val->valueint);
    x = pobj->x + FixedMul(dist, finecosine[angle]); 
    y = pobj->y + FixedMul(dist, finesine[angle]);

    int typeId = cJSON_GetObjectItem(req, "type")->valueint;
    int typeNbr = GetInternalTypeIdFromDoomEdNum(typeId);
    if (typeNbr == -1)
    {
        return API_CreateErrorResponse(400, "typeId not found");
    }

    mobj_t *mobj = P_SpawnMobj(x, y, ONCEILINGZ, typeNbr);
    // if (mobj->info->seestate != S_NULL && P_LookForPlayers (mobj, true))
    // {
    //     P_SetMobjState (mobj, mobj->info->seestate);
    // }
    cJSON *root = DescribeMObj(mobj);
    api_response_t resp = {201, root};
    return resp;
}

api_response_t API_GetWorldObjects(int max_distance)
{
    cJSON *root = cJSON_CreateArray();
    mobj_t *t;
    mobj_t * player = players[CONSOLE_PLAYER].mo;
    for (int i = 0; i < numsectors; i++) {
        t = sectors[i].thinglist;
        while (t)
        {
            float dist = API_FixedToFloat(P_AproxDistance(player->x - t->x, player->y - t->y));
            if ((max_distance > 0 && dist > max_distance) || mobjinfo[t->type].doomednum == -1)
            {
                t = t->snext;
                continue;
            }

            cJSON *objJson = DescribeMObj(t);
            cJSON_AddNumberToObject(objJson, "distance", dist);
            cJSON_AddItemToArray(root, objJson);
            t = t->snext;
        }
    }
    api_response_t resp = {200, root};
    return resp;
}

api_response_t API_PatchWorldObject(int id, cJSON *req)
{
    mobj_t *obj = FindObjectById(id);
    if (!obj)
    {
        return API_CreateErrorResponse(404, "object not found");
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

    cJSON *flags = cJSON_GetObjectItem(req, "flags");
    if (flags) {
        val = cJSON_GetObjectItem(flags, "MF_SHOOTABLE");
        if (val) API_FlipFlag(&obj->flags, MF_SHOOTABLE, val->valueint == 1);
        val = cJSON_GetObjectItem(flags, "MF_SHADOW");
        if (val) API_FlipFlag(&obj->flags, MF_SHADOW, val->valueint == 1);
        val = cJSON_GetObjectItem(flags, "MF_NOBLOOD");
        if (val) API_FlipFlag(&obj->flags, MF_NOBLOOD, val->valueint == 1);
        val = cJSON_GetObjectItem(flags, "MF_NOGRAVITY");
        if (val) API_FlipFlag(&obj->flags, MF_NOGRAVITY, val->valueint == 1);
    }

    cJSON* root = DescribeMObj(obj);
    api_response_t resp = {200, root};
    return resp;
}

api_response_t API_DeleteWorldObject(int id)
{
    mobj_t *obj = FindObjectById(id);
    if (!obj)
    {
        return API_CreateErrorResponse(404, "object not found");
    }
    P_KillMobj(NULL, obj);
    api_response_t resp = {204, NULL};
    return resp;
}

api_response_t API_GetWorldObject(int id)
{
    mobj_t *obj = FindObjectById(id);
    if (!obj)
    {
        return API_CreateErrorResponse(404, "object not found");
    }
    cJSON* root = DescribeMObj(obj);
    api_response_t resp = {200, root};
    return resp;
}

api_response_t API_GetWorldDoors(int max_distance)
{
    mobj_t * player = players[CONSOLE_PLAYER].mo;
    int sectorIds[512];
    int sectorCount = 0;
    cJSON *root = cJSON_CreateArray();

    for (int i = 0; i < numlines; i++)
    {
        line_t *line = &lines[i];
        sector_t *sec = sides[line->sidenum[1]].sector;
        int seenSector = 0;
        for (int j = 0; j < sectorCount; j++)
        {
            if (sectorIds[j] == sec->id)
            {
                seenSector = 1;
                break;
            }
        }
        if (seenSector || !IsLineADoor(line))
        {
            continue;
        }

        float dist = API_FixedToFloat(P_AproxDistance(player->x - line->v1->x, player->y - line->v1->y));
        if (max_distance == 0 || dist < max_distance)
        {
            cJSON *door = DescribeDoor(i, line);
            cJSON_AddNumberToObject(door, "distance", dist);
            cJSON_AddItemToArray(root, door);
        }
        sectorIds[sectorCount++] = sec->id;
    }
    api_response_t resp = {200, root};
    return resp;
}

api_response_t API_GetWorldDoor(int id)
{
    if (!IsLineADoor(&lines[id]))
    {
        return API_CreateErrorResponse(404, "door does not exist");
    }
    cJSON *door = DescribeDoor(id, &lines[id]);
    api_response_t resp = {200, door};
    return resp;
}

api_response_t API_PatchWorldDoor(int id, cJSON *req)
{
    if (!IsLineADoor(&lines[id]))
    {
        return API_CreateErrorResponse(404, "door does not exist");
    }
    cJSON *state = cJSON_GetObjectItem(req, "state");
    if (state)
    {
        sector_t *sec = sides[lines[id].sidenum[1]].sector;                
        if ((strcmp(state->valuestring, "open") == 0 && sec->floorheight == sec->ceilingheight) ||
            (strcmp(state->valuestring, "closed") == 0 && sec->floorheight != sec->ceilingheight))
        {
            //EV_DoDoor(&lines[id], vld_open);
            EV_VerticalDoor(&lines[id], players[CONSOLE_PLAYER].mo);
        }
    }
    cJSON *door = DescribeDoor(id, &lines[id]);
    api_response_t resp = {200, door};
    return resp;
}
