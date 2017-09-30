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
extern int *weapon_keys[];

api_response_t API_PostMessage(cJSON *req)
{
    cJSON *message;

    message = cJSON_GetObjectItem(req, "text");
    if (message)
    {
        if (cJSON_IsString(message))
        {
            API_SetHUDMessage(cJSON_GetObjectItem(req, "text")->valuestring);
        }
        else
        {
            return (api_response_t){ 400, NULL };
        }
    }
    else
    {
        return (api_response_t){ 400, NULL };
    }
    
    return (api_response_t){ 201, NULL };
}

api_response_t API_PostPlayerAction(cJSON *req)
{
    int amount;
    char *type;
    cJSON *amount_obj;
    cJSON *type_obj;
    int *weapon_key;
    event_t event;

    type_obj = cJSON_GetObjectItem(req, "type");
    if (type_obj == NULL || !cJSON_IsString(type_obj))
        return API_CreateErrorResponse(400, "Action type not specified or specified incorrectly");
    type = type_obj->valuestring;
    amount_obj = cJSON_GetObjectItem(req, "amount");

    // Optional amount field, default to 10 if not set or set incorrectly
    if (amount_obj == NULL)
    {
        amount = 10;
    }
    else
    {
        if (!cJSON_IsNumber(amount_obj))
        {
            return API_CreateErrorResponse(400, "amount must be a number");
        }
        amount = amount_obj->valueint;
        if (amount < 1)
        {
            return API_CreateErrorResponse(400, "amount must be positive and non-zero");
        }
    }
    

    if (strcmp(type, "forward") == 0)
    {
        keys_down[key_up] = amount;
        event.type = ev_keydown;
        event.data1 = key_up;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else if (strcmp(type, "backward") == 0)
    {
        keys_down[key_down] = amount;
        event.type = ev_keydown;
        event.data1 = key_down;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else if (strcmp(type, "turn-left") == 0) 
    {
        keys_down[key_left] = amount;
        event.type = ev_keydown;
        event.data1 = key_left;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else if (strcmp(type, "turn-right") == 0) 
    {
        keys_down[key_right] = amount;
        event.type = ev_keydown;
        event.data1 = key_right;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else if (strcmp(type, "strafe-left") == 0) 
    {
        keys_down[key_strafeleft] = amount;
        event.type = ev_keydown;
        event.data1 = key_strafeleft;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else if (strcmp(type, "strafe-right") == 0) 
    {
        keys_down[key_straferight] = amount;
        event.type = ev_keydown;
        event.data1 = key_straferight;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else if (strcmp(type, "switch-weapon") == 0) 
    {
	    if (amount < 1 || amount > 8)
	        return API_CreateErrorResponse(400, "invalid weapon selected");
        weapon_key = weapon_keys[amount - 1];
        keys_down[*weapon_key] = 10;
        event.type = ev_keydown;
        event.data1 = *weapon_key;
        event.data2 = 0;
        D_PostEvent(&event);
    }
    else if (strcmp(type, "use") == 0) 
    {
        P_UseLines(&players[consoleplayer]);
    }
    else if (strcmp(type, "shoot") == 0)
    {
        P_FireWeapon(&players[consoleplayer]);
    }
    else 
    {
        return API_CreateErrorResponse(400, "invalid action type");
    }

    return (api_response_t) {201, NULL};
}

cJSON* getPlayer(int playernum)
{
    player_t *player;
    cJSON *root;
    cJSON *key_cards;
    cJSON *cheats;

    player = &players[playernum];
    root = DescribeMObj(player->mo);
    cJSON_AddNumberToObject(root, "armor", player->armorpoints);
    cJSON_AddNumberToObject(root, "kills", player->killcount);
    cJSON_AddNumberToObject(root, "items", player->itemcount);
    cJSON_AddNumberToObject(root, "secrets", players->secretcount);
    cJSON_AddNumberToObject(root, "weapon", player->readyweapon);
    
    key_cards = cJSON_CreateObject();
    cJSON_AddBoolToObject(key_cards, "blue", player->cards[it_bluecard]);
    cJSON_AddBoolToObject(key_cards, "red", player->cards[it_redcard]);
    cJSON_AddBoolToObject(key_cards, "yellow", player->cards[it_yellowcard]);
    cJSON_AddItemToObject(root, "keyCards", key_cards);

    cheats = cJSON_CreateObject();
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
    player_t *player;
    cJSON *val;
    cJSON *flags;

    if (M_CheckParm("-connect") > 0)
        return API_CreateErrorResponse(403, "clients may not patch the player");

    player = &players[consoleplayer];

    val = cJSON_GetObjectItem(req, "weapon");
    if (val)
    {
	    if (cJSON_IsNumber(val))
            player->weaponowned[val->valueint - 1] = true;
        else
            return API_CreateErrorResponse(400, "Weapon value must be integer");
    }

    val = cJSON_GetObjectItem(req, "armor");
    if (val)
    {
	    if (cJSON_IsNumber(val))
            player->armorpoints = val->valueint;
        else
            return API_CreateErrorResponse(400, "Armor value must be integer");
    }

    val = cJSON_GetObjectItem(req, "health");
    if (val)
    {
	    if (cJSON_IsNumber(val))
        {
            // we have to set both of these at the same time
            player->health = val->valueint;
            player->mo->health = val->valueint;
        }
        else
        {
            return API_CreateErrorResponse(400, "Health value must be integer");
        }
    }

    flags = cJSON_GetObjectItem(req, "cheatFlags");
    if (flags)
    {
        val = cJSON_GetObjectItem(flags, "CF_GODMODE");
        if (val) 
        {
	        if (cJSON_IsNumber(val))
                API_FlipFlag(&player->cheats, CF_GODMODE, val->valueint == 1);
            else
                return API_CreateErrorResponse(400, "GODMODE value must be integer");
        }
        val = cJSON_GetObjectItem(flags, "CF_NOCLIP");
        if (val) 
        {
	        if (cJSON_IsNumber(val))
                API_FlipFlag(&player->cheats, CF_NOCLIP, val->valueint == 1);
            else
                return API_CreateErrorResponse(400, "NOCLIP value must be integer");
        }
    }

    return API_GetPlayer();
}

api_response_t API_DeletePlayer() 
{
    player_t *player;

    if (M_CheckParm("-connect") > 0)
        return API_CreateErrorResponse(403, "clients may not kill players");
    player = &players[consoleplayer];  
    P_KillMobj(NULL, player->mo);
    return API_GetPlayer();
}
