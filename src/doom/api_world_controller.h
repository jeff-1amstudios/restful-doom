#include "api.h"

api_response_t API_PatchWorld(cJSON *req);
api_response_t API_GetWorld();

api_response_t API_PostWorldObjects(cJSON *req);
api_response_t API_GetWorldObjects(int max_distance);
api_response_t API_PatchWorldObject(int id, cJSON *req);
api_response_t API_DeleteWorldObject(int id);
api_response_t API_GetWorldObject(int id);

api_response_t API_GetWorldScreenshot();