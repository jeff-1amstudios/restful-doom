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

cJSON *DescribeWorldState() {
  cJSON *root = cJSON_CreateObject();
  cJSON_AddNumberToObject(root, "episode", gameepisode);
  cJSON_AddNumberToObject(root, "map", gamemap);

  sector_t *sector = players[consoleplayer].mo->subsector->sector;
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
        struct line_s *line = players[consoleplayer].mo->subsector->sector->lines[0];
        EV_LightTurnOn(line, 255);
    }
    else {
        struct line_s *line = players[consoleplayer].mo->subsector->sector->lines[0];
        EV_LightTurnOn(line, 75);
    }
  }
  return (api_response_t) { 200, DescribeWorldState() };
}

api_response_t API_GetWorldScreenshot()
{
    unlink("/tmp/DOOM00.pcx");
    V_ScreenShot("/tmp/DOOM%02i.%s");
    cJSON *body = cJSON_CreateObject();
    cJSON_AddStringToObject(body, "path", "/tmp/DOOM00.pcx");
    api_response_t resp = {200, body};
    return resp;
}
