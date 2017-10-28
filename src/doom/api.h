#ifndef __API_H__
#define __API_H__

#include <string.h>
#include "api_cJSON.h"
#include "api_yuarel.h"

#include "p_local.h"
#include "m_fixed.h"
#include "m_argv.h"

#define NUMKEYS   256
#define NUMDESCRIPTIONS 125

int keys_down[NUMKEYS];
int target_angle;

void API_Init(int port);
void API_RunIO();
float API_FixedToFloat(fixed_t fixed);
fixed_t API_FloatToFixed(float val);
cJSON* DescribeMObj(mobj_t *obj);
void API_SetHUDMessage(char *msg);
void API_FlipFlag(int *flags, int mask, boolean on);
void postTurnEvent(int amount);

typedef struct {
  int id;
  char *text;
} api_obj_description_t;

typedef struct {
  char method[10];
  char full_path[512];
  struct yuarel url;
  char *body;
} api_request_t;

typedef struct {
  int status_code;
  cJSON *json;
} api_response_t;

api_response_t API_CreateErrorResponse(int status, char *message);

#endif
