#pragma once
#include <array>
#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

namespace ultra_external {
std::string sha256(const std::vector<uint8_t>& bytes);
class PeImage {
 public:
  explicit PeImage(const std::vector<uint8_t>& bytes,void* shim_context);
  ~PeImage();
  PeImage(const PeImage&)=delete;
  PeImage& operator=(const PeImage&)=delete;
  void* function(unsigned index) const {return functions_.at(index);}
  static void validate(const std::vector<uint8_t>& bytes);
 private:
  void* image_=nullptr;
  size_t image_size_=0;
  void* traps_=nullptr;
  size_t trap_size_=0;
  std::array<void*,7> functions_{};
};
}
