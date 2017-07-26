#include "api.h"

api_response_t API_GetDoors(int max_distance);
api_response_t API_GetDoor(int id);
api_response_t API_PatchDoor(int id, cJSON *req);