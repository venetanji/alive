/* Original finite Windows clipboard reader for the synthetic patch only. */
#include <windows.h>
#include <stdio.h>
#include <string.h>

int main(int argc, char **argv) {
    if (argc != 2 || !OpenClipboard(NULL)) return 2;
    UINT format = 0;
    while ((format = EnumClipboardFormats(format))) {
        char name[256] = {0};
        GetClipboardFormatNameA(format, name, sizeof(name));
        HANDLE handle = GetClipboardData(format);
        SIZE_T size = handle ? GlobalSize(handle) : 0;
        printf("format=%u bytes=%llu name=%s\n", format, (unsigned long long)size, name);
        if (!handle || !size || size > 1048576 || format == CF_BITMAP || format == CF_PALETTE) continue;
        const void *data = GlobalLock(handle);
        if (!data) continue;
        char path[4096];
        snprintf(path, sizeof(path), "%s.format-%u.bin", argv[1], format);
        FILE *output = fopen(path, "wb");
        if (output) { fwrite(data, 1, size, output); fclose(output); }
        GlobalUnlock(handle);
    }
    CloseClipboard();
    return 0;
}
