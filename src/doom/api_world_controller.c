#include "api_world_controller.h"
#include "g_game.h"
#include "p_local.h"
#include "v_video.h"
#include <unistd.h>

// externally-defined game variables
extern  skill_t         gameskill;
extern int              gameepisode;
extern int              gamemap;
extern player_t         players[MAXPLAYERS];
extern int consoleplayer;
static char *doom_skills[] =
{
    "I'm too young to die.", "Hey, not too rough.", "Hurt me plenty.",
    "Ultra-Violence.", "NIGHTMARE!",
};

cJSON *DescribeWorldState() 
{
    cJSON *root;
    sector_t *sector;
    char *iwadname;
    int iwadparm;
    
    root = cJSON_CreateObject();
    cJSON_AddNumberToObject(root, "episode", gameepisode);
    cJSON_AddNumberToObject(root, "map", gamemap);
    
    iwadparm = M_CheckParmWithArgs("-iwad", 1);
    iwadname = myargv[iwadparm + 1];
    cJSON_AddStringToObject(root, "wad", iwadname);

    cJSON_AddStringToObject(root, "skill", doom_skills[gameskill]);

    if (players[consoleplayer].mo != NULL)
    {
        sector = players[consoleplayer].mo->subsector->sector;
        cJSON_AddStringToObject(root, "lights", sector->lightlevel == 75 ? "off" : "on");
    }
    else
    {
        cJSON_AddStringToObject(root, "lights", "unknown");
    }

    return root;
}


// Controller methods

api_response_t API_GetWorld(cJSON *req) {
  return (api_response_t) { 200, DescribeWorldState() };
}

api_response_t API_PatchWorld(cJSON *req) 
{
    cJSON *val;
    boolean changed = false;

    if (M_CheckParm("-connect") > 0)
        return API_CreateErrorResponse(403, "clients may not patch the world");
      
    val = cJSON_GetObjectItem(req, "episode");
    if (val) 
    {
        if (cJSON_IsNumber(val))
        {
            gameepisode = val->valueint;
            changed = true;
        }
        else
        {
            return API_CreateErrorResponse(400, "episode must be integer");
        }
    }

    val = cJSON_GetObjectItem(req, "map");
    if (val) 
    {
        if (cJSON_IsNumber(val))
        {
            gamemap = val->valueint;
            changed = true;
        }
        else
        {
            return API_CreateErrorResponse(400, "map must be integer");
        }
    }
  
    val = cJSON_GetObjectItem(req, "skill");
    if (val) 
    {
        if (cJSON_IsNumber(val))
        {
            gameskill = val->valueint;
            changed = true;
        }
        else
        {
            return API_CreateErrorResponse(400, "skill must be integer");
        }
    }

    if (changed) 
    {
        G_DeferedInitNew (gameskill, gameepisode, gamemap);
    }

    val = cJSON_GetObjectItem(req, "lights");
    if (val) 
    {
        if (cJSON_IsString(val))
        {
            if (strcmp(val->valuestring, "on") == 0) 
            {
                struct line_s *line = players[consoleplayer].mo->subsector->sector->lines[0];
                EV_LightTurnOn(line, 255);
            }
            else 
            {
                struct line_s *line = players[consoleplayer].mo->subsector->sector->lines[0];
                EV_LightTurnOn(line, 75);
            }
        }
        else
        {
            return API_CreateErrorResponse(400, "lights must be string: on|off");
        }
    }
  
    return (api_response_t) { 200, DescribeWorldState() };
}

api_response_t API_GetWorldScreenshot()
{
    cJSON *body;

    unlink("/tmp/DOOM00.pcx");
    V_ScreenShot("/tmp/DOOM%02i.%s");
    body = cJSON_CreateObject();
    cJSON_AddStringToObject(body, "path", "/tmp/DOOM00.pcx");
    return (api_response_t) {200, body};
}
