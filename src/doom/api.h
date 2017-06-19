#ifndef __API_H__
#define __API_H__

#include <string.h>
#include "api_cJSON.h"

#include "p_local.h"
#include "m_fixed.h"

#define NUMKEYS   256
int keys_down[NUMKEYS];

void API_Init(int port);
void API_RunIO();
float API_FixedToFloat(fixed_t fixed);
fixed_t API_FloatToFixed(float val);
cJSON* DescribeMObj(mobj_t *obj);

typedef struct {
  int status_code;
  cJSON *json;
} api_response_t;

api_response_t API_CreateErrorResponse(int status, char *message);

#endif