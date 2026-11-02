#include "../src-tauri/native/external_device/external_device.h"
#include <cassert>
#include <cstring>
int main(){
 char error[128]{};
 assert(!ultra_external_device_open("/unused/local-device.dll","unused",error,sizeof(error)));
 assert(std::strstr(error,"unavailable"));
 assert(ultra_external_device_parameter_count(nullptr)==0);
 float value=0;assert(!ultra_external_device_get_commanded_parameter(nullptr,0,&value));
 ultra_external_device_close(nullptr);
}
