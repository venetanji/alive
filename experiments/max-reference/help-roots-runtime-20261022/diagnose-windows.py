#!/usr/bin/env python3
"""Read bounded private X window metadata without input or image capture."""
import argparse
import ctypes as C
import json


def observe(display):
    x=C.CDLL('libX11.so.6');P=C.c_void_p;U=C.c_ulong
    x.XOpenDisplay.argtypes=[C.c_char_p];x.XOpenDisplay.restype=P
    x.XDefaultRootWindow.argtypes=[P];x.XDefaultRootWindow.restype=U
    x.XQueryTree.argtypes=[P,U,C.POINTER(U),C.POINTER(U),C.POINTER(C.POINTER(U)),C.POINTER(C.c_uint)]
    x.XFetchName.argtypes=[P,U,C.POINTER(C.c_char_p)]
    x.XGetTransientForHint.argtypes=[P,U,C.POINTER(U)]
    x.XFree.argtypes=[P];x.XCloseDisplay.argtypes=[P];x.XSync.argtypes=[P,C.c_int]
    class XError(C.Structure):
        _fields_=[('type',C.c_int),('display',P),('resourceid',U),('serial',U),
                  ('error_code',C.c_ubyte),('request_code',C.c_ubyte),('minor_code',C.c_ubyte)]
    errors=[]
    handler_type=C.CFUNCTYPE(C.c_int,P,C.POINTER(XError))
    @handler_type
    def on_error(connection,error):
        if len(errors)<16:errors.append(int(error.contents.error_code))
        return 0
    x.XSetErrorHandler.argtypes=[handler_type];x.XSetErrorHandler(on_error)
    connection=x.XOpenDisplay(display.encode())
    if not connection:return dict(status='display-unavailable',windows=[],x_errors=errors,truncated=False)
    rows=[];truncated=False
    try:
        queue=[(int(x.XDefaultRootWindow(connection)),0)];visited=set()
        while queue:
            parent,depth=queue.pop(0)
            if parent in visited:continue
            visited.add(parent)
            root=U();ancestor=U();children=C.POINTER(U)();count=C.c_uint()
            if not x.XQueryTree(connection,parent,C.byref(root),C.byref(ancestor),C.byref(children),C.byref(count)):
                continue
            try:
                remaining=256-len(rows)
                if count.value>remaining:truncated=True
                for index in range(min(count.value,remaining)):
                    window=int(children[index]);name=C.c_char_p();title='';transient=U()
                    try:
                        if x.XFetchName(connection,window,C.byref(name)) and name.value:
                            title=name.value.decode(errors='replace')
                    finally:
                        if name:x.XFree(name)
                    has_transient=x.XGetTransientForHint(connection,window,C.byref(transient))
                    rows.append(dict(window=window,parent=parent,title=title,
                        transient_for=int(transient.value) if has_transient else None))
                    if depth<2:queue.append((window,depth+1))
                if len(rows)>=256:
                    truncated=truncated or bool(queue);break
            finally:
                if children:x.XFree(children)
        x.XSync(connection,0)
        return dict(status='observed',windows=rows,x_errors=errors,truncated=truncated)
    finally:x.XCloseDisplay(connection)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--display',required=True)
    args=parser.parse_args()
    print(json.dumps(observe(args.display),ensure_ascii=True,allow_nan=False))
