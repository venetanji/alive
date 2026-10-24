#pragma once
#include <cstdint>

namespace ultra::session_bits {
constexpr unsigned count(uint32_t mask) noexcept {
  unsigned result = 0;
  while (mask) {
    result += mask & 1u;
    mask >>= 1;
  }
  return result;
}
constexpr unsigned first(uint32_t mask) noexcept {
  if (!mask)
    return 32;
  unsigned result = 0;
  while (!(mask & 1u)) {
    ++result;
    mask >>= 1;
  }
  return result;
}
} // namespace ultra::session_bits
