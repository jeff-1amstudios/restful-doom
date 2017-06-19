#include <stdio.h>
#include <string.h>

#include "api.h"
#include "api_cJSON.h"

#include "d_player.h"
#include "m_menu.h"
#include "../d_event.h"
#include "../doomkeys.h"
#include "p_local.h"

#define CONSOLE_PLAYER 0

// externally-defined game variables
extern player_t players[MAXPLAYERS];
extern void P_KillMobj( mobj_t* source, mobj_t* target );

// locals
char player_message[512];

api_response_t API_PostMessage(cJSON *req)
{
    memset(player_message, 0, 512);
    sprintf(player_message, "%s", cJSON_GetObjectItem(req, "text")->valuestring);
    players[CONSOLE_PLAYER].message = player_message;
    return (api_response_t){ 201, NULL };
}

api_response_t API_PostPlayerAction(cJSON *req)
{
    char *type = cJSON_GetObjectItem(req, "type")->valuestring;
    if (strcmp(type, "forward") == 0)
    {
        keys_down[KEY_UPARROW] = 20;
        event_t event;
        event.type = ev_keydown;
        event.data1 = KEY_UPARROW;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else if (strcmp(type, "backward") == 0)
    {
        keys_down[KEY_DOWNARROW] = 20;
        event_t event;
        event.type = ev_keydown;
        event.data1 = KEY_DOWNARROW;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else if (strcmp(type, "turn-left") == 0) {
        keys_down[KEY_LEFTARROW] = 10;
        event_t event;
        event.type = ev_keydown;
        event.data1 = KEY_LEFTARROW;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else if (strcmp(type, "turn-right") == 0) {
        keys_down[KEY_RIGHTARROW] = 10;
        event_t event;
        event.type = ev_keydown;
        event.data1 = KEY_RIGHTARROW;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else if (strcmp(type, "shoot") == 0)
    {
        keys_down[KEY_RCTRL] = 40;
        event_t event;
        event.type = ev_keydown;
        event.data1 = KEY_RCTRL;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else {
        return API_CreateErrorResponse(400, "invalid action type");
    }
    return (api_response_t) {201, NULL};
}

api_response_t API_GetPlayer()
{
    player_t *player = &players[CONSOLE_PLAYER];
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
    return (api_response_t) {200, root};
}

api_response_t API_PatchPlayer(cJSON *req)
{
    player_t *player = &players[CONSOLE_PLAYER];
    cJSON *prop = cJSON_GetObjectItem(req, "weapon");
    if (prop)
    {
        int weapon = prop->valueint;
        if (!player->weaponowned[weapon]) {
            return API_CreateErrorResponse(400, "player does not have requested weapon");
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

api_response_t API_DeletePlayer() {
  player_t *player = &players[CONSOLE_PLAYER];  
  P_KillMobj(NULL, player->mo);
}