#include <stdio.h>
#include <string.h>

#include "api.h"
#include "api_cJSON.h"

#include "p_local.h"

// externally-defined game variables
extern player_t players[MAXPLAYERS];

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
    cJSON_AddStringToObject(door, "keyRequired", key_color);
    return door;
}

api_response_t API_GetDoors(int max_distance)
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

api_response_t API_GetDoor(int id)
{
    if (!IsLineADoor(&lines[id]))
    {
        return API_CreateErrorResponse(404, "door does not exist");
    }
    cJSON *door = DescribeDoor(id, &lines[id]);
    api_response_t resp = {200, door};
    return resp;
}

api_response_t API_PatchDoor(int id, cJSON *req)
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

