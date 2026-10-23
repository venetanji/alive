#define _GNU_SOURCE
#include <webkit2/webkit2.h>
#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

static void received(WebKitUserContentManager *manager, WebKitJavascriptResult *result, gpointer data) {
    (void)manager; (void)data;
    char *value = jsc_value_to_string(webkit_javascript_result_get_js_value(result));
    const char *path = getenv("ALIVE_METRICS_LOG");
    if (path) { FILE *out = fopen(path, "a"); if (out) { fprintf(out, "%s\n", value); fclose(out); } }
    g_free(value);
}

static gboolean command(gpointer data) {
    const char *path = getenv("ALIVE_METRICS_COMMAND");
    char *source = NULL; gsize length;
    if (path && g_file_get_contents(path, &source, &length, NULL)) {
        unlink(path);
        webkit_web_view_evaluate_javascript(WEBKIT_WEB_VIEW(data), source, length, NULL, "audit-local-command", NULL, NULL, NULL);
        g_free(source);
    }
    return G_SOURCE_CONTINUE;
}

void webkit_web_view_load_uri(WebKitWebView *view, const gchar *uri) {
    static void (*original)(WebKitWebView *, const gchar *);
    if (!original) original = dlsym(RTLD_NEXT, "webkit_web_view_load_uri");
    if (!g_object_get_data(G_OBJECT(view), "alive-audit")) {
        char *source = NULL; gsize length;
        const char *path = getenv("ALIVE_METRICS_SCRIPT");
        if (path && g_file_get_contents(path, &source, &length, NULL)) {
            WebKitUserContentManager *manager = webkit_web_view_get_user_content_manager(view);
            webkit_user_content_manager_register_script_message_handler(manager, "aliveAudit");
            g_signal_connect(manager, "script-message-received::aliveAudit", G_CALLBACK(received), NULL);
            WebKitUserScript *script = webkit_user_script_new(source, WEBKIT_USER_CONTENT_INJECT_TOP_FRAME, WEBKIT_USER_SCRIPT_INJECT_AT_DOCUMENT_START, NULL, NULL);
            webkit_user_content_manager_add_script(manager, script);
            webkit_user_script_unref(script); g_free(source);
            g_object_set_data(G_OBJECT(view), "alive-audit", GINT_TO_POINTER(1));
            g_timeout_add(200, command, view);
        }
    }
    original(view, uri);
}
