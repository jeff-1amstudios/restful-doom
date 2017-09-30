#include <stdio.h>
#include <string.h>

#include "api.h"
#include "api_cJSON.h"

#include "d_player.h"
#include "m_menu.h"
#include "../d_event.h"
#include "../doomkeys.h"
#include "p_local.h"

// externally-defined game variables
extern player_t players[MAXPLAYERS];
extern void P_FireWeapon (player_t* player);
extern void P_KillMobj( mobj_t* source, mobj_t* target );

extern int key_right;
extern int key_left;
extern int key_up;
extern int key_down;
extern int key_strafeleft;
extern int key_straferight;
extern int consoleplayer;

api_response_t API_PostMessage(cJSON *req)
{
    API_SetHUDMessage(cJSON_GetObjectItem(req, "text")->valuestring);
    return (api_response_t){ 201, NULL };
}

api_response_t API_PostPlayerAction(cJSON *req)
{
    char *type = cJSON_GetObjectItem(req, "type")->valuestring;
    cJSON *amount_obj = cJSON_GetObjectItem(req, "amount");
    int amount;

    // Optional amount field, default to 10 if not set
    if (amount_obj == NULL)
        amount = 10;
    else
        amount = amount_obj->valueint;

    if (strcmp(type, "forward") == 0)
    {
        keys_down[key_up] = amount;
        event_t event;
        event.type = ev_keydown;
        event.data1 = key_up;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else if (strcmp(type, "backward") == 0)
    {
        keys_down[key_down] = amount;
        event_t event;
        event.type = ev_keydown;
        event.data1 = key_down;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else if (strcmp(type, "turn-left") == 0) {
        keys_down[key_left] = amount;
        event_t event;
        event.type = ev_keydown;
        event.data1 = key_left;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else if (strcmp(type, "turn-right") == 0) {
        keys_down[key_right] = amount;
        event_t event;
        event.type = ev_keydown;
        event.data1 = key_right;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else if (strcmp(type, "strafe-left") == 0) {
        keys_down[key_strafeleft] = amount;
        event_t event;
        event.type = ev_keydown;
        event.data1 = key_strafeleft;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else if (strcmp(type, "strafe-right") == 0) {
        keys_down[key_straferight] = amount;
        event_t event;
        event.type = ev_keydown;
        event.data1 = key_straferight;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else if (strcmp(type, "use") == 0) {
        P_UseLines(&players[consoleplayer]);
    }
    else if (strcmp(type, "shoot") == 0)
    {
        P_FireWeapon(&players[consoleplayer]);
    }
    else {
        return API_CreateErrorResponse(400, "invalid action type");
    }
    return (api_response_t) {201, NULL};
}

cJSON* getPlayer(int playernum)
{
    player_t *player = &players[playernum];
    cJSON *root = DescribeMObj(player->mo);
    cJSON_AddNumberToObject(root, "armor", player->armorpoints);
    cJSON_AddNumberToObject(root, "kills", player->killcount);
    cJSON_AddNumberToObject(root, "items", player->itemcount);
    cJSON_AddNumberToObject(root, "secrets", players->secretcount);
    cJSON_AddNumberToObject(root, "weapon", player->readyweapon);
    
    cJSON *key_cards = cJSON_CreateObject();
    cJSON_AddBoolToObject(key_cards, "blue", player->cards[it_bluecard]);
    cJSON_AddBoolToObject(key_cards, "red", player->cards[it_redcard]);
    cJSON_AddBoolToObject(key_cards, "yellow", player->cards[it_yellowcard]);
    cJSON_AddItemToObject(root, "keyCards", key_cards);

    cJSON *cheats = cJSON_CreateObject();
    if (player->cheats & CF_NOCLIP) cJSON_AddTrueToObject(cheats, "CF_NOCLIP");
    if (player->cheats & CF_GODMODE) cJSON_AddTrueToObject(cheats, "CF_GODMODE");
    cJSON_AddItemToObject(root, "cheatFlags", cheats);
    return root;
}

api_response_t API_GetPlayer()
{
    cJSON *root = getPlayer(consoleplayer);
    return (api_response_t) {200, root};
}

api_response_t API_GetPlayers()
{
    cJSON *root = cJSON_CreateArray();
    for (int i = 0; i < MAXPLAYERS; i++)
    {
        if ((&players[i])->mo != 0x0)
        {
            cJSON *player = getPlayer(i);
            cJSON_AddBoolToObject(player, "isConsolePlayer", i == consoleplayer);
            cJSON_AddItemToArray(root, player);
        }
    }
    return (api_response_t) {200, root};
}

api_response_t API_PatchPlayer(cJSON *req)
{
    player_t *player = &players[consoleplayer];
    cJSON *val = cJSON_GetObjectItem(req, "weapon");
    if (val)
    {
        int weapon = val->valueint;
        if (!player->weaponowned[weapon]) {
            return API_CreateErrorResponse(400, "player does not have requested weapon");
        }
        player->pendingweapon = weapon;
    }
    val = cJSON_GetObjectItem(req, "armor");
    if (val) player->armorpoints = val->valueint;

    val = cJSON_GetObjectItem(req, "health");
    if (val)
    {
        // we have to set both of these at the same time
        player->health = val->valueint;
        player->mo->health = val->valueint;
    }

    cJSON *flags = cJSON_GetObjectItem(req, "cheatFlags");
    if (flags)
    {
      val = cJSON_GetObjectItem(flags, "CF_GODMODE");
      if (val) API_FlipFlag(&player->cheats, CF_GODMODE, val->valueint == 1);
      val = cJSON_GetObjectItem(flags, "CF_NOCLIP");
      if (val) API_FlipFlag(&player->cheats, CF_NOCLIP, val->valueint == 1);
    }

    return API_GetPlayer();
}

api_response_t API_DeletePlayer() {
  player_t *player = &players[consoleplayer];  
  P_KillMobj(NULL, player->mo);
  return API_GetPlayer();
}
