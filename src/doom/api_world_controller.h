#include "api.h"

api_response_t API_PatchWorld(cJSON *req);
api_response_t API_GetWorld();

api_response_t API_PostWorldObjects(cJSON *req);
api_response_t API_GetWorldObjects();
api_response_t API_PatchWorldObject(int id, cJSON *req);
api_response_t API_DeleteWorldObject(int id);
api_response_t API_GetWorldObject(int id);

api_response_t API_GetWorldDoors();
api_response_t API_GetWorldDoor(int id);
api_response_t API_PatchWorldDoor(int id, cJSON *req);
