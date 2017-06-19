#include "api.h"

// Player handlers
api_response_t API_PostMessage(cJSON *req);
api_response_t API_PostPlayerAction(cJSON *req);
api_response_t API_GetPlayer();
api_response_t API_PatchPlayer(cJSON *req);
api_response_t API_DeletePlayer();
