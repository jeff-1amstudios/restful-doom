#include "api_object_controller.h"

#include "d_player.h"
#include "p_local.h"

extern api_obj_description_t api_descriptors[];
extern int consoleplayer;

// externally-defined game variables
extern player_t         players[MAXPLAYERS];
extern void             P_KillMobj( mobj_t* source, mobj_t* target );

angle_t degreesToAngle(int degrees) {
    return ((float)degrees / 360) * ANG_MAX;
}

int GetInternalTypeIdFromObjectDescription(char *objectDescription)
{
    for (int i = 0; i < NUMDESCRIPTIONS; i++)
    {
        if (strcmp(api_descriptors[i].text, objectDescription) == 0) {
            for (int j = 0; j < NUMMOBJTYPES; j++)
            {
                if (mobjinfo[j].doomednum == api_descriptors[i].id)
                {
                    return j;
                }
            }
            break;
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

// Controller methods

api_response_t API_PostObject(cJSON *req)
{
    mobj_t *pobj;
    mobj_t *mobj;
    fixed_t angle;    
    fixed_t x, y, z;
    cJSON *val;
    cJSON *pos;
    cJSON *root;
    int dist;
    int typeNbr;
    char *type;

    if (M_CheckParm("-connect") > 0)
        return API_CreateErrorResponse(403, "Clients may not spawn objects");

    pobj = players[consoleplayer].mo;
    angle = pobj->angle >> ANGLETOFINESHIFT;

    val = cJSON_GetObjectItem(req, "distance");
    if (val)
    {
        dist = API_FloatToFixed(val->valueint);
        x = pobj->x + FixedMul(dist, finecosine[angle]);
        y = pobj->y + FixedMul(dist, finesine[angle]);
        z = ONCEILINGZ;
    }
    else
    {
        pos = cJSON_GetObjectItem(req, "position");
        val = cJSON_GetObjectItem(pos, "x");
        x = API_FloatToFixed(val->valuedouble);
        val = cJSON_GetObjectItem(pos, "y");
        y = API_FloatToFixed(val->valuedouble);
        val = cJSON_GetObjectItem(pos, "z");
        z = API_FloatToFixed(val->valuedouble);
    }

    type = cJSON_GetObjectItem(req, "type")->valuestring;
    typeNbr = GetInternalTypeIdFromObjectDescription(type);
    if (typeNbr == -1)
    {
        return API_CreateErrorResponse(400, "type not found");
    }

    mobj = P_SpawnMobj(x, y, z, typeNbr);

    val = cJSON_GetObjectItem(req, "angle");
    if (val) mobj->angle = degreesToAngle(val->valueint);

    val = cJSON_GetObjectItem(req, "id");
    if (val) mobj->id = val->valueint;

    root = DescribeMObj(mobj);
    return (api_response_t) {201, root};
}

api_response_t API_GetObjects(int max_distance)
{
    cJSON *root;
    cJSON *objJson;
    mobj_t *t;
    mobj_t *player;
    float dist;

    root = cJSON_CreateArray();
    player = players[consoleplayer].mo;
    for (int i = 0; i < numsectors; i++) {
        t = sectors[i].thinglist;
        while (t)
        {
            dist = API_FixedToFloat(P_AproxDistance(player->x - t->x, player->y - t->y));
            if ((max_distance > 0 && dist > max_distance))
            {
                t = t->snext;
                continue;
            }

            objJson = DescribeMObj(t);
            cJSON_AddNumberToObject(objJson, "distance", dist);
            cJSON_AddItemToArray(root, objJson);
            t = t->snext;
        }
    }
    return (api_response_t) {200, root};
}

api_response_t API_PatchObject(int id, cJSON *req)
{
    mobj_t *obj;
    mobj_t *obj_to_attack;
    cJSON *pos;
    cJSON *val;
    cJSON *flags;
    cJSON *root;

    if (M_CheckParm("-connect") > 0)
        return API_CreateErrorResponse(403, "Clients may not modify objects");

    obj = FindObjectById(id);
    if (!obj)
    {
        return API_CreateErrorResponse(404, "object not found");
    }
    pos = cJSON_GetObjectItem(req, "position");
    if (pos) {
        P_UnsetThingPosition(obj);
        val = cJSON_GetObjectItem(pos, "x");
        if (val) obj->x = API_FloatToFixed(val->valuedouble);
        
        val = cJSON_GetObjectItem(pos, "y");
        if (val) obj->y = API_FloatToFixed(val->valuedouble);
        
        val = cJSON_GetObjectItem(pos, "z");
        if (val) obj->z = API_FloatToFixed(val->valuedouble);
        
        P_SetThingPosition(obj);
    }
    val = cJSON_GetObjectItem(req, "angle");
    if (val) obj->angle = degreesToAngle(val->valueint);

    val = cJSON_GetObjectItem(req, "health");
    if (val) obj->health = val->valueint;

    val = cJSON_GetObjectItem(req, "attacking");
    if (val)
    {
        obj_to_attack = FindObjectById(val->valueint);
        if (!obj) {
            return API_CreateErrorResponse(400, "attacking object not valid");
        }
        obj->target = obj_to_attack;
        P_SetMobjState (obj, obj->info->seestate);
    }

    flags = cJSON_GetObjectItem(req, "flags");
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
    root = DescribeMObj(obj);
    return (api_response_t) {200, root};
}

api_response_t API_DeleteObject(int id)
{
    mobj_t *obj;

    if (M_CheckParm("-connect") > 0)
        return API_CreateErrorResponse(403, "Clients may not delete objects");

    obj = FindObjectById(id);
    if (!obj)
    {
        return API_CreateErrorResponse(404, "object not found");
    }
    P_KillMobj(NULL, obj);
    return (api_response_t) {204, NULL};
}





api_response_t API_GetObject(int id)
{
    mobj_t *obj;
    cJSON *root;

    obj = FindObjectById(id);
    if (!obj)
    {
        return API_CreateErrorResponse(404, "object not found");
    }
    root = DescribeMObj(obj);
    return (api_response_t) {200, root};
}

api_response_t API_GetLineOfSightToObject(int id, int id2)
{
    boolean los;
    cJSON *root;
    mobj_t *obj = FindObjectById(id);
    mobj_t *obj2 = FindObjectById(id2);

    if (!obj || !obj2)
    {
        return API_CreateErrorResponse(404, "object not found");
    }

    los = P_CheckSight (obj, obj2);  

    root = cJSON_CreateObject();
    cJSON_AddNumberToObject(root, "id", obj->id);
    cJSON_AddNumberToObject(root, "id2", obj2->id);
    cJSON_AddBoolToObject(root,"los", los);
    
    return (api_response_t) {200, root};
}

//API_GetCheckMove
api_response_t API_GetCheckTraverse(int id, float x, float y)
{
    boolean result;
    cJSON *root;    
    mobj_t *obj = FindObjectById(id);
   
    if (!obj)
    {
        return API_CreateErrorResponse(404, "object not found");
    }

    result = P_PathTraverse(obj->x, obj->y,API_FloatToFixed(x),API_FloatToFixed(y), PT_ADDLINES,PTR_AimTraverse);
    
    root = cJSON_CreateObject();
    cJSON_AddNumberToObject(root, "id", id);
    cJSON_AddNumberToObject(root, "x", x);
    cJSON_AddNumberToObject(root, "y", y);
    cJSON_AddBoolToObject(root,"result", result);

    return (api_response_t) {200, root};
}
