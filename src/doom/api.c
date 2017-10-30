#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <SDL_net.h>
#include <pthread.h>
#include <math.h>

#include "api.h"
#include "d_player.h"
#include "m_menu.h"
#include "../d_event.h"
#include "../doomkeys.h"
#include "p_local.h"
#include "api_player_controller.h"
#include "api_world_controller.h"
#include "api_door_controller.h"
#include "api_object_controller.h"


extern api_obj_description_t api_descriptors[];
char path[100];
char hud_message[512];
pthread_mutex_t api_lock;

TCPsocket server_sd;
TCPsocket client_sd;
SDLNet_SocketSet set;

void API_AfterTic();
boolean API_ParseRequest(char *buffer, int buffer_len, api_request_t *request);
api_response_t API_RouteRequest(api_request_t request);
void API_SendResponse(api_response_t resp);

// externally-defined game variables
extern player_t players[MAXPLAYERS];
extern int consoleplayer;

void API_Init(int port)
{
    IPaddress ip;
    const char *host;

    target_angle = -1;

#ifdef DOOM_THREADED
    // mutex for ensuring only a single API thread is running
    pthread_mutex_init(&api_lock, NULL);
#endif

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

    host = SDLNet_ResolveIP(&ip);
    printf("API_Init: Listening for connections on %s:%d\n", host, port);
}

void *API_RunIO_main(void *arg)
{
    TCPsocket csd;
    int recv_len = 0;
    char buffer[1024];
    IPaddress *remote_ip;
    const char *ip_str;

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
            api_request_t request;
            api_response_t response;
            if (API_ParseRequest(buffer, recv_len, &request)) {
                char msg[512];
                snprintf(msg, 512, "%s %s", request.method, request.full_path);
                API_SetHUDMessage(msg);
                response = API_RouteRequest(request);
            }
            else 
            {
                response = API_CreateErrorResponse(400, "invalid request");
            }

            API_SendResponse(response);

            // access log
            remote_ip = SDLNet_TCP_GetPeerAddress(client_sd);
            ip_str = SDLNet_ResolveIP(remote_ip);
            printf("access_log: %s - - - \"%s %s\" %d\n", ip_str, request.method, request.full_path, response.status_code);

            SDLNet_TCP_DelSocket(set, client_sd);
            SDLNet_TCP_Close(client_sd);
        }
    }

    API_AfterTic();
#ifdef DOOM_THREADED
    pthread_mutex_unlock(&api_lock);  // we're done so unlock the mutex and allow another API loop to start
#endif
    return NULL;  // seems dumb but is required by pthread
}

void API_RunIO()
{
#ifdef DOOM_THREADED
    // The main api loop takes a long time to run, so do it asynchronously
    // If api is still being serviced, skip and try again next time
    if (pthread_mutex_trylock(&api_lock) == 0 )
    {
        pthread_t tid;
        pthread_create(&tid, NULL, &API_RunIO_main, NULL);
        pthread_detach(tid);
    }
#else
    API_RunIO_main(NULL);
#endif
}

boolean API_ParseRequest(char *buffer, int buffer_len, api_request_t *request)
{
    char method[10];
    char protocol[10];
    struct yuarel url;
    char *http_entity_body;
    int ret;

    buffer[buffer_len] = 0;
    ret = sscanf(buffer, "%s%s%s", method, path, protocol);
    if (ret != 3) {
        return false;
    }

    strncpy(request->full_path, path, 512);

    if (-1 == yuarel_parse(&url, path)) {
        return false;
    }
    http_entity_body = strstr(buffer, "\r\n\r\n");
    if (http_entity_body == NULL)
    {
        return false;
    }

    request->url = url;
    strncpy(request->method, method, 10);
    request->body = http_entity_body;
    return true;
}


// ----
//  Route an http path + method to a controller action
// ----
api_response_t API_RouteRequest(api_request_t req)
{
    int id;
    int id2;
    int distance;
    int p;
    float x = 0.0;
    float y = 0.0;
    struct yuarel_param params[3];
    char *method = req.method;
    char *path = req.url.path;
    cJSON *json = cJSON_Parse(req.body);
    
    if (strcmp(path, "api/message") == 0)
    {
        if (strcmp(method, "POST") == 0)
        {
            return API_PostMessage(json);
        } 
        return API_CreateErrorResponse(405, "Method not allowed");
    }
    else if (strcmp(path, "api/player") == 0)
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
        return API_CreateErrorResponse(405, "Method not allowed");
    }
    else if (strcmp(path, "api/player/actions") == 0)
    {
        if (strcmp(method, "POST") == 0)
        {
            return API_PostPlayerAction(json);
        }
        return API_CreateErrorResponse(405, "Method not allowed");
    }
    else if (strcmp(path, "api/player/turn") == 0)
    {
        if (strcmp(method, "POST") == 0)
        {
            return API_PostTurnDegrees(json);
        }
        return API_CreateErrorResponse(405, "Method not allowed");
    }
    else if (strcmp(path, "api/players") == 0)
    {
        if (strcmp(method, "GET") == 0)
        {
            return API_GetPlayers();
        }
        return API_CreateErrorResponse(405, "Method not allowed");
    }
    else if (strstr(path, "api/players/") != NULL) {
        if (sscanf(path, "api/players/%d", &id) != 1) {
            return API_CreateErrorResponse(404, "path not found");
        }
        else if (strcmp(method, "GET") == 0)
        {
            return API_GetPlayerById(id);
        }
        else if (strcmp(method, "PATCH") == 0) 
        {
            return API_PatchPlayerById(json, id);
        }
        else if (strcmp(method, "DELETE") == 0) 
        {
            return API_DeletePlayerById(id);
        }
        return API_CreateErrorResponse(405, "Method not allowed");
    }
    else if (strcmp(path, "api/world") == 0) {
        if (strcmp(method, "GET") == 0) {
            return API_GetWorld();
        }
        else if (strcmp(method, "PATCH") == 0) {
            return API_PatchWorld(json);
        }
        return API_CreateErrorResponse(405, "Method not allowed");
    }
    else if (strcmp(path, "api/world/screenshot") == 0) {
        if (strcmp(method, "GET") == 0) {
            return API_GetWorldScreenshot();
        }
        return API_CreateErrorResponse(405, "Method not allowed");
    }
    else if (strcmp(path, "api/world/objects") == 0)
    {
        if (strcmp(method, "POST") == 0) 
        {
            return API_PostObject(json);
        }
        else if (strcmp(method, "GET") == 0)
        {
            distance = 0;
            p = yuarel_parse_query(req.url.query, '&', params, 1);
            while (p-- > 0) {
                if (strcmp("distance", params[p].key) == 0) {
                    distance = atoi(params[p].val);
                }
            }
            return API_GetObjects(distance);
        }
        return API_CreateErrorResponse(405, "Method not allowed");
    }
    else if (strstr(path, "api/world/objects/") != NULL) {
        if (sscanf(path, "api/world/objects/%d", &id) != 1) {
            return API_CreateErrorResponse(404, "path not found");
        }
        if (strcmp(method, "DELETE") == 0)
        {
            return API_DeleteObject(id);
        }
        else if (strcmp(method, "GET") == 0)
        {
            return API_GetObject(id);
        }
        else if (strcmp(method, "PATCH") == 0)
        {
            return API_PatchObject(id, json);
        }
        return API_CreateErrorResponse(405, "Method not allowed");
    }
    else if (strstr(path, "api/world/los/") != NULL) {
        sscanf(path, "api/world/los/%d/%d", &id,&id2);
      
        if (strcmp(method, "GET") == 0)
        {
            return API_GetLineOfSightToObject(id,id2);
        }
       
        return API_CreateErrorResponse(405, "Method not allowed");
    }

    else if (strcmp(path, "api/world/movetest") == 0) {
        if (strcmp(method, "GET") == 0)
        {
            p = yuarel_parse_query(req.url.query, '&', params, 3);
            while (p-- > 0) {
                if (strcmp("id", params[p].key) == 0) {
                    id = atoi(params[p].val); 
                }
                if (strcmp("x", params[p].key) == 0) {
                    x = atoi(params[p].val);
                }
                if (strcmp("y", params[p].key) == 0) {
                    y = atoi(params[p].val);
                }
            }
            return API_GetCheckTraverse(id,x,y);
        }
        return API_CreateErrorResponse(405, "Method not allowed");
    }

    else if (strcmp(path, "api/world/doors") == 0) {
        if (strcmp(method, "GET") == 0)
        {
            distance = 0;
            p = yuarel_parse_query(req.url.query, '&', params, 1);
            while (p-- > 0) {
                if (strcmp("distance", params[p].key) == 0) {
                    distance = atoi(params[p].val);
                }
            }
            return API_GetDoors(distance);
        }
        return API_CreateErrorResponse(405, "Method not allowed");
    }
    else if (strstr(path, "api/world/doors/") != NULL)
    {
        if (sscanf(path, "api/world/doors/%d", &id) != 1) {
            return API_CreateErrorResponse(404, "path not found");
        }
        if (strcmp(method, "PATCH") == 0)
        {
            return API_PatchDoor(id, json);
        }
        else if (strcmp(method, "GET") == 0)
        {
            return API_GetDoor(id);
        }
        return API_CreateErrorResponse(405, "Method not allowed");
    }
    return API_CreateErrorResponse(404, "Not found");
}

void API_SendResponse(api_response_t resp) {
    char buffer[255];
    int len;

    sprintf(buffer, "HTTP/1.0 %d\r\nConnection: close\r\nAccess-Control-Allow-Origin: *\r\nContent-Type:application/json\r\n\r\n", resp.status_code);
    len = strlen(buffer);
    if (SDLNet_TCP_Send(client_sd, (void *)buffer, len) < len) {
        printf("failed to send all bytes\n");
    }
    if (resp.json)
    {
        char *jsonToString = cJSON_Print(resp.json);
        len = strlen(jsonToString);
        if (SDLNet_TCP_Send(client_sd, (void *)jsonToString, len) < len) {
            printf("failed to send all bytes\n");
        }
        free(jsonToString);
        cJSON_Delete(resp.json);
    }
}

api_response_t API_CreateErrorResponse(int status, char *message) {
  cJSON *body = cJSON_CreateObject();
  cJSON_AddStringToObject(body, "error", message);
  return (api_response_t) { status, body };
}

void postTurnEvent(int amount)
{
    event_t event;
    event.type = ev_mouse;
    event.data1 = 0;  // buttons held down
    event.data2 = amount;  // turn (positive clockwise)
    event.data3 = 0;  // move (max 16 units per tic)
    D_PostEvent(&event);
}

int angleToDegrees(angle_t angle)
{
    return ((double)angle / ANG_MAX) * 360;
}

int turnAmount(int remainingAngle)
{
    int amount = pow(remainingAngle, 2);
    if (amount > 500)
        return 500;
    else
        return amount;
}

void turnPlayer()
{
    int direction;
    int remaining;
    int playerAngle;

    if (target_angle >= 0)
    {
        player_t *player = &players[consoleplayer];
        playerAngle = angleToDegrees(player->mo->angle);
        remaining = target_angle - playerAngle;
        if (remaining < 0)
            remaining = remaining + 360;

        if (remaining < 180)
            direction = -1;
        else
            direction = 1;

        if (remaining == 0) {
            target_angle =- 1;
            return;
        }
        else
        {
            postTurnEvent(turnAmount(remaining) * direction);
        }
    }
}

void API_AfterTic()
{
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

    turnPlayer();
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

cJSON* DescribeMObj(mobj_t *obj)
{
    cJSON *pos;
    cJSON *flags;
    cJSON *root = cJSON_CreateObject();
    cJSON_AddNumberToObject(root, "id", obj->id);
    cJSON_AddItemToObject(root, "position", pos = cJSON_CreateObject());
    cJSON_AddNumberToObject(pos, "x", API_FixedToFloat(obj->x));
    cJSON_AddNumberToObject(pos, "y", API_FixedToFloat(obj->y));
    cJSON_AddNumberToObject(pos, "z", API_FixedToFloat(obj->z));
    cJSON_AddNumberToObject(root, "angle", angleToDegrees(obj->angle));
    cJSON_AddNumberToObject(root, "height", API_FixedToFloat(obj->height));
    cJSON_AddNumberToObject(root, "health", obj->health);
    cJSON_AddNumberToObject(root, "typeId", mobjinfo[obj->type].doomednum);

    // this is... inefficient :(
    for (int i = 0; i < NUMDESCRIPTIONS; i++)
    {
        if (api_descriptors[i].id == mobjinfo[obj->type].doomednum) {
            cJSON_AddStringToObject(root, "type", api_descriptors[i].text);
            break;
        }
    }

    if (obj->target) {
        cJSON_AddNumberToObject(root, "attacking", obj->target->id);
    }

    flags = cJSON_CreateObject();
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

void API_SetHUDMessage(char *msg)
{
    strncpy(hud_message, msg, 512);
    players[consoleplayer].message = hud_message;
}

void API_FlipFlag(int *flags, int mask, boolean on) {
    if (on)
    {
        *flags |= mask;
    }
    else
    {
        *flags &= ~mask;
    }
}
