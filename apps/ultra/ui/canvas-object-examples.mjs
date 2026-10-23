// Original Ultra examples; kept identical to ../examples/*.ultra by a contract test.
export const OBJECT_EXAMPLES = {
  "int": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 160,
        "y": 60,
        "params": {
          "text": "12.75"
        }
      },
      {
        "id": 2,
        "type": "int",
        "x": 160,
        "y": 180,
        "params": {
          "value": 7
        }
      },
      {
        "id": 3,
        "type": "flonum",
        "x": 160,
        "y": 300,
        "params": {
          "value": 0,
          "minimum": -100000,
          "maximum": 100000,
          "numdecimalplaces": 6
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 2,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      }
    ]
  },
  "float": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 160,
        "y": 60,
        "params": {
          "text": "12.75"
        }
      },
      {
        "id": 2,
        "type": "float",
        "x": 160,
        "y": 180,
        "params": {
          "value": 0
        }
      },
      {
        "id": 3,
        "type": "flonum",
        "x": 160,
        "y": 300,
        "params": {
          "value": 0,
          "minimum": -100000,
          "maximum": 100000,
          "numdecimalplaces": 6
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 2,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      }
    ]
  },
  "flonum": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 160,
        "y": 60,
        "params": {
          "text": "1.25"
        }
      },
      {
        "id": 2,
        "type": "flonum",
        "x": 160,
        "y": 180,
        "params": {
          "value": 0,
          "minimum": -10,
          "maximum": 10,
          "numdecimalplaces": 3
        }
      },
      {
        "id": 3,
        "type": "bang",
        "x": 360,
        "y": 300,
        "params": {}
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 2,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 1,
        "to": 3,
        "inlet": 0
      }
    ]
  },
  "slider": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "slider",
        "x": 160,
        "y": 60,
        "params": {
          "value": 0,
          "size": 101,
          "min": 0,
          "mult": 1,
          "floatoutput": 1
        }
      },
      {
        "id": 2,
        "type": "flonum",
        "x": 360,
        "y": 180,
        "params": {
          "value": 0,
          "minimum": -100000,
          "maximum": 100000,
          "numdecimalplaces": 6
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 2,
        "inlet": 0
      }
    ]
  },
  "pack": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "flonum",
        "x": 80,
        "y": 60,
        "params": {
          "value": 60,
          "minimum": -100000,
          "maximum": 100000,
          "numdecimalplaces": 6
        }
      },
      {
        "id": 2,
        "type": "flonum",
        "x": 300,
        "y": 60,
        "params": {
          "value": 100,
          "minimum": -100000,
          "maximum": 100000,
          "numdecimalplaces": 6
        }
      },
      {
        "id": 3,
        "type": "flonum",
        "x": 520,
        "y": 60,
        "params": {
          "value": 250.5,
          "minimum": -100000,
          "maximum": 100000,
          "numdecimalplaces": 6
        }
      },
      {
        "id": 4,
        "type": "pack",
        "x": 300,
        "y": 200,
        "params": {
          "args": "i i f"
        }
      },
      {
        "id": 5,
        "type": "unpack",
        "x": 300,
        "y": 320,
        "params": {
          "args": "i i f"
        }
      },
      {
        "id": 6,
        "type": "flonum",
        "x": 80,
        "y": 460,
        "params": {
          "value": 0,
          "minimum": -100000,
          "maximum": 100000,
          "numdecimalplaces": 6
        }
      },
      {
        "id": 7,
        "type": "flonum",
        "x": 300,
        "y": 460,
        "params": {
          "value": 0,
          "minimum": -100000,
          "maximum": 100000,
          "numdecimalplaces": 6
        }
      },
      {
        "id": 8,
        "type": "flonum",
        "x": 520,
        "y": 460,
        "params": {
          "value": 0,
          "minimum": -100000,
          "maximum": 100000,
          "numdecimalplaces": 6
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 4,
        "inlet": 1
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 2
      },
      {
        "from": 4,
        "outlet": 0,
        "to": 5,
        "inlet": 0
      },
      {
        "from": 5,
        "outlet": 0,
        "to": 6,
        "inlet": 0
      },
      {
        "from": 5,
        "outlet": 1,
        "to": 7,
        "inlet": 0
      },
      {
        "from": 5,
        "outlet": 2,
        "to": 8,
        "inlet": 0
      }
    ]
  },
  "unpack": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 280,
        "y": 60,
        "params": {
          "text": "12 34 5.5"
        }
      },
      {
        "id": 2,
        "type": "unpack",
        "x": 280,
        "y": 180,
        "params": {
          "args": "i i f"
        }
      },
      {
        "id": 3,
        "type": "flonum",
        "x": 80,
        "y": 340,
        "params": {
          "value": 0,
          "minimum": -100000,
          "maximum": 100000,
          "numdecimalplaces": 6
        }
      },
      {
        "id": 4,
        "type": "flonum",
        "x": 300,
        "y": 340,
        "params": {
          "value": 0,
          "minimum": -100000,
          "maximum": 100000,
          "numdecimalplaces": 6
        }
      },
      {
        "id": 5,
        "type": "flonum",
        "x": 520,
        "y": 340,
        "params": {
          "value": 0,
          "minimum": -100000,
          "maximum": 100000,
          "numdecimalplaces": 6
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 2,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 1,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 2,
        "to": 5,
        "inlet": 0
      }
    ]
  },
  "select": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "slider",
        "x": 280,
        "y": 60,
        "params": {
          "value": 0,
          "size": 8,
          "min": 0,
          "mult": 1,
          "floatoutput": 0
        }
      },
      {
        "id": 2,
        "type": "select",
        "x": 280,
        "y": 220,
        "params": {
          "args": "3 7"
        }
      },
      {
        "id": 3,
        "type": "bang",
        "x": 80,
        "y": 380,
        "params": {}
      },
      {
        "id": 4,
        "type": "bang",
        "x": 300,
        "y": 380,
        "params": {}
      },
      {
        "id": 5,
        "type": "flonum",
        "x": 520,
        "y": 380,
        "params": {
          "value": 0,
          "minimum": -100000,
          "maximum": 100000,
          "numdecimalplaces": 6
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 2,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 1,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 2,
        "to": 5,
        "inlet": 0
      }
    ]
  },
  "route": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 80,
        "y": 60,
        "params": {
          "text": "note 64 100"
        }
      },
      {
        "id": 2,
        "type": "message",
        "x": 400,
        "y": 60,
        "params": {
          "text": "color 7"
        }
      },
      {
        "id": 3,
        "type": "route",
        "x": 240,
        "y": 200,
        "params": {
          "args": "note color"
        }
      },
      {
        "id": 4,
        "type": "unpack",
        "x": 80,
        "y": 340,
        "params": {
          "args": "i i"
        }
      },
      {
        "id": 5,
        "type": "flonum",
        "x": 80,
        "y": 480,
        "params": {
          "value": 0,
          "minimum": -100000,
          "maximum": 100000,
          "numdecimalplaces": 6
        }
      },
      {
        "id": 6,
        "type": "flonum",
        "x": 300,
        "y": 480,
        "params": {
          "value": 0,
          "minimum": -100000,
          "maximum": 100000,
          "numdecimalplaces": 6
        }
      },
      {
        "id": 7,
        "type": "flonum",
        "x": 520,
        "y": 340,
        "params": {
          "value": 0,
          "minimum": -100000,
          "maximum": 100000,
          "numdecimalplaces": 6
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 4,
        "outlet": 0,
        "to": 5,
        "inlet": 0
      },
      {
        "from": 4,
        "outlet": 1,
        "to": 6,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 1,
        "to": 7,
        "inlet": 0
      }
    ]
  },
  "trigger": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 280,
        "y": 60,
        "params": {
          "text": "12.75"
        }
      },
      {
        "id": 2,
        "type": "trigger",
        "x": 280,
        "y": 180,
        "params": {
          "args": "b i f"
        }
      },
      {
        "id": 3,
        "type": "bang",
        "x": 80,
        "y": 340,
        "params": {}
      },
      {
        "id": 4,
        "type": "flonum",
        "x": 300,
        "y": 340,
        "params": {
          "value": 0,
          "minimum": -100000,
          "maximum": 100000,
          "numdecimalplaces": 6
        }
      },
      {
        "id": 5,
        "type": "flonum",
        "x": 520,
        "y": 340,
        "params": {
          "value": 0,
          "minimum": -100000,
          "maximum": 100000,
          "numdecimalplaces": 6
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 2,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 1,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 2,
        "to": 5,
        "inlet": 0
      }
    ]
  },
  "line": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 80,
        "y": 60,
        "params": {
          "text": "100 500"
        }
      },
      {
        "id": 2,
        "type": "message",
        "x": 300,
        "y": 60,
        "params": {
          "text": "0 500"
        }
      },
      {
        "id": 3,
        "type": "message",
        "x": 520,
        "y": 60,
        "params": {
          "text": "stop"
        }
      },
      {
        "id": 4,
        "type": "line",
        "x": 300,
        "y": 220,
        "params": {
          "value": 0,
          "time": 0,
          "grain": 20,
          "floatoutput": 1
        }
      },
      {
        "id": 5,
        "type": "slider",
        "x": 180,
        "y": 380,
        "params": {
          "value": 0,
          "size": 101,
          "min": 0,
          "mult": 1,
          "floatoutput": 1
        }
      },
      {
        "id": 6,
        "type": "flonum",
        "x": 360,
        "y": 380,
        "params": {
          "value": 0,
          "minimum": -100000,
          "maximum": 100000,
          "numdecimalplaces": 2
        }
      },
      {
        "id": 7,
        "type": "bang",
        "x": 520,
        "y": 380,
        "params": {}
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 4,
        "outlet": 0,
        "to": 5,
        "inlet": 0
      },
      {
        "from": 4,
        "outlet": 0,
        "to": 6,
        "inlet": 0
      },
      {
        "from": 4,
        "outlet": 1,
        "to": 7,
        "inlet": 0
      }
    ]
  },
  "print": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message_box",
        "x": 80,
        "y": 60,
        "params": {
          "text": "note 60 100"
        }
      },
      {
        "id": 2,
        "type": "print",
        "x": 80,
        "y": 160,
        "params": {
          "label": "notes",
          "level": 0,
          "popup": 1
        }
      },
      {
        "id": 3,
        "type": "slider",
        "x": 300,
        "y": 60,
        "params": {
          "value": 0,
          "size": 101,
          "min": -1,
          "mult": 0.02,
          "floatoutput": 1
        }
      },
      {
        "id": 4,
        "type": "print",
        "x": 300,
        "y": 160,
        "params": {
          "label": "position",
          "level": 0,
          "popup": 1
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 2,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      }
    ]
  },
  "send": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 65,
        "y": 65,
        "params": {
          "text": "60 100"
        }
      },
      {
        "id": 2,
        "type": "send",
        "x": 65,
        "y": 125,
        "params": {
          "name": "ultra-help-notes"
        }
      },
      {
        "id": 3,
        "type": "receive",
        "x": 330,
        "y": 125,
        "params": {
          "name": "ultra-help-notes"
        }
      },
      {
        "id": 4,
        "type": "print",
        "x": 330,
        "y": 200,
        "params": {
          "label": "named-notes",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 2,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      }
    ]
  },
  "receive": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 65,
        "y": 65,
        "params": {
          "text": "60 100"
        }
      },
      {
        "id": 2,
        "type": "send",
        "x": 65,
        "y": 125,
        "params": {
          "name": "ultra-help-notes"
        }
      },
      {
        "id": 3,
        "type": "receive",
        "x": 330,
        "y": 125,
        "params": {
          "name": "ultra-help-notes"
        }
      },
      {
        "id": 4,
        "type": "print",
        "x": 330,
        "y": 200,
        "params": {
          "label": "named-notes",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 2,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      }
    ]
  },
  "iter": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 65,
        "y": 65,
        "params": {
          "text": "1 2.5 red 4 5.5 blue 7"
        }
      },
      {
        "id": 2,
        "type": "message",
        "x": 65,
        "y": 115,
        "params": {
          "text": "bang"
        }
      },
      {
        "id": 3,
        "type": "iter",
        "x": 65,
        "y": 220,
        "params": {}
      },
      {
        "id": 4,
        "type": "print",
        "x": 65,
        "y": 345,
        "params": {
          "label": "iter",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      }
    ]
  },
  "prepend": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 65,
        "y": 65,
        "params": {
          "text": "1 2.5 red 4 5.5 blue 7"
        }
      },
      {
        "id": 2,
        "type": "message",
        "x": 65,
        "y": 115,
        "params": {
          "text": "bang"
        }
      },
      {
        "id": 3,
        "type": "prepend",
        "x": 65,
        "y": 220,
        "params": {
          "args": "list"
        }
      },
      {
        "id": 4,
        "type": "print",
        "x": 65,
        "y": 345,
        "params": {
          "label": "prepend",
          "level": 0,
          "popup": 0
        }
      },
      {
        "id": 5,
        "type": "message",
        "x": 340,
        "y": 115,
        "params": {
          "text": "set list marker"
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 5,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      }
    ]
  },
  "append": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 65,
        "y": 65,
        "params": {
          "text": "1 2.5 red 4 5.5 blue 7"
        }
      },
      {
        "id": 2,
        "type": "message",
        "x": 65,
        "y": 115,
        "params": {
          "text": "bang"
        }
      },
      {
        "id": 3,
        "type": "append",
        "x": 65,
        "y": 220,
        "params": {
          "args": "tail"
        }
      },
      {
        "id": 4,
        "type": "print",
        "x": 65,
        "y": 345,
        "params": {
          "label": "append",
          "level": 0,
          "popup": 0
        }
      },
      {
        "id": 5,
        "type": "message",
        "x": 340,
        "y": 115,
        "params": {
          "text": "set end"
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 5,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      }
    ]
  },
  "zl_reg": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 65,
        "y": 65,
        "params": {
          "text": "1 2.5 red 4 5.5 blue 7"
        }
      },
      {
        "id": 2,
        "type": "message",
        "x": 65,
        "y": 115,
        "params": {
          "text": "bang"
        }
      },
      {
        "id": 3,
        "type": "zl_reg",
        "x": 65,
        "y": 220,
        "params": {
          "args": "8 seed"
        }
      },
      {
        "id": 4,
        "type": "print",
        "x": 65,
        "y": 345,
        "params": {
          "label": "zl_reg",
          "level": 0,
          "popup": 0
        }
      },
      {
        "id": 5,
        "type": "message",
        "x": 340,
        "y": 115,
        "params": {
          "text": "9 changed"
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 5,
        "outlet": 0,
        "to": 3,
        "inlet": 1
      }
    ]
  },
  "zl_join": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 65,
        "y": 65,
        "params": {
          "text": "1 2.5 red"
        }
      },
      {
        "id": 2,
        "type": "message",
        "x": 65,
        "y": 115,
        "params": {
          "text": "bang"
        }
      },
      {
        "id": 3,
        "type": "zl_join",
        "x": 65,
        "y": 220,
        "params": {
          "args": "8 tail"
        }
      },
      {
        "id": 4,
        "type": "print",
        "x": 65,
        "y": 345,
        "params": {
          "label": "zl_join",
          "level": 0,
          "popup": 0
        }
      },
      {
        "id": 5,
        "type": "message",
        "x": 340,
        "y": 115,
        "params": {
          "text": "9 changed"
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 5,
        "outlet": 0,
        "to": 3,
        "inlet": 1
      }
    ]
  },
  "zl_len": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 65,
        "y": 65,
        "params": {
          "text": "1 2.5 red 4 5.5 blue 7"
        }
      },
      {
        "id": 2,
        "type": "message",
        "x": 65,
        "y": 115,
        "params": {
          "text": "bang"
        }
      },
      {
        "id": 3,
        "type": "zl_len",
        "x": 65,
        "y": 220,
        "params": {}
      },
      {
        "id": 4,
        "type": "print",
        "x": 65,
        "y": 345,
        "params": {
          "label": "zl_len",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      }
    ]
  },
  "zl_iter": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 65,
        "y": 65,
        "params": {
          "text": "1 2.5 red 4 5.5 blue 7"
        }
      },
      {
        "id": 2,
        "type": "message",
        "x": 65,
        "y": 115,
        "params": {
          "text": "bang"
        }
      },
      {
        "id": 3,
        "type": "zl_iter",
        "x": 65,
        "y": 220,
        "params": {
          "size": 3
        }
      },
      {
        "id": 4,
        "type": "print",
        "x": 65,
        "y": 345,
        "params": {
          "label": "zl_iter",
          "level": 0,
          "popup": 0
        }
      },
      {
        "id": 5,
        "type": "message",
        "x": 340,
        "y": 115,
        "params": {
          "text": "2"
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 5,
        "outlet": 0,
        "to": 3,
        "inlet": 1
      }
    ]
  },
  "zl_slice": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 65,
        "y": 65,
        "params": {
          "text": "1 2.5 red 4 5.5 blue 7"
        }
      },
      {
        "id": 2,
        "type": "message",
        "x": 65,
        "y": 115,
        "params": {
          "text": "bang"
        }
      },
      {
        "id": 3,
        "type": "zl_slice",
        "x": 65,
        "y": 220,
        "params": {
          "size": 2
        }
      },
      {
        "id": 4,
        "type": "print",
        "x": 65,
        "y": 345,
        "params": {
          "label": "zl_slice",
          "level": 0,
          "popup": 0
        }
      },
      {
        "id": 5,
        "type": "message",
        "x": 340,
        "y": 115,
        "params": {
          "text": "2"
        }
      },
      {
        "id": 6,
        "type": "print",
        "x": 340,
        "y": 345,
        "params": {
          "label": "slice-tail",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 5,
        "outlet": 0,
        "to": 3,
        "inlet": 1
      },
      {
        "from": 3,
        "outlet": 1,
        "to": 6,
        "inlet": 0
      }
    ]
  },
  "zl_rev": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 65,
        "y": 65,
        "params": {
          "text": "1 2.5 red 4 5.5 blue 7"
        }
      },
      {
        "id": 2,
        "type": "message",
        "x": 65,
        "y": 115,
        "params": {
          "text": "bang"
        }
      },
      {
        "id": 3,
        "type": "zl_rev",
        "x": 65,
        "y": 220,
        "params": {}
      },
      {
        "id": 4,
        "type": "print",
        "x": 65,
        "y": 345,
        "params": {
          "label": "zl_rev",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      }
    ]
  },
  "zl_rot": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 65,
        "y": 65,
        "params": {
          "text": "1 2.5 red 4 5.5 blue 7"
        }
      },
      {
        "id": 2,
        "type": "message",
        "x": 65,
        "y": 115,
        "params": {
          "text": "bang"
        }
      },
      {
        "id": 3,
        "type": "zl_rot",
        "x": 65,
        "y": 220,
        "params": {
          "rotation": 2
        }
      },
      {
        "id": 4,
        "type": "print",
        "x": 65,
        "y": 345,
        "params": {
          "label": "zl_rot",
          "level": 0,
          "popup": 0
        }
      },
      {
        "id": 5,
        "type": "message",
        "x": 340,
        "y": 115,
        "params": {
          "text": "-2"
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 5,
        "outlet": 0,
        "to": 3,
        "inlet": 1
      }
    ]
  },
  "sig": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 160,
        "y": 60,
        "params": {
          "text": "0.75 -0.25"
        }
      },
      {
        "id": 2,
        "type": "sig",
        "x": 160,
        "y": 160,
        "params": {
          "args": "0.25 -0.5"
        }
      },
      {
        "id": 3,
        "type": "snapshot",
        "x": 160,
        "y": 270,
        "params": {
          "interval": 100,
          "offset": 0
        }
      },
      {
        "id": 4,
        "type": "print",
        "x": 160,
        "y": 360,
        "params": {
          "label": "sig",
          "level": 0,
          "popup": 0
        }
      },
      {
        "id": 5,
        "type": "snapshot",
        "x": 400,
        "y": 270,
        "params": {
          "interval": 100,
          "offset": 0
        }
      },
      {
        "id": 6,
        "type": "print",
        "x": 400,
        "y": 360,
        "params": {
          "label": "sig-second",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 2,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 1,
        "to": 5,
        "inlet": 0
      },
      {
        "from": 5,
        "outlet": 0,
        "to": 6,
        "inlet": 0
      }
    ]
  },
  "signal_add": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "sig",
        "x": 160,
        "y": 60,
        "params": {
          "args": "0.25"
        }
      },
      {
        "id": 2,
        "type": "message",
        "x": 400,
        "y": 60,
        "params": {
          "text": "0.75"
        }
      },
      {
        "id": 3,
        "type": "signal_add",
        "x": 160,
        "y": 160,
        "params": {
          "rhs": 0.5
        }
      },
      {
        "id": 4,
        "type": "snapshot",
        "x": 160,
        "y": 270,
        "params": {
          "interval": 100,
          "offset": 0
        }
      },
      {
        "id": 5,
        "type": "print",
        "x": 160,
        "y": 360,
        "params": {
          "label": "signal_add",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 1
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 4,
        "outlet": 0,
        "to": 5,
        "inlet": 0
      }
    ]
  },
  "signal_subtract": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "sig",
        "x": 160,
        "y": 60,
        "params": {
          "args": "0.25"
        }
      },
      {
        "id": 2,
        "type": "message",
        "x": 400,
        "y": 60,
        "params": {
          "text": "0.75"
        }
      },
      {
        "id": 3,
        "type": "signal_subtract",
        "x": 160,
        "y": 160,
        "params": {
          "rhs": 0.5
        }
      },
      {
        "id": 4,
        "type": "snapshot",
        "x": 160,
        "y": 270,
        "params": {
          "interval": 100,
          "offset": 0
        }
      },
      {
        "id": 5,
        "type": "print",
        "x": 160,
        "y": 360,
        "params": {
          "label": "signal_subtract",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 1
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 4,
        "outlet": 0,
        "to": 5,
        "inlet": 0
      }
    ]
  },
  "signal_multiply": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "sig",
        "x": 160,
        "y": 60,
        "params": {
          "args": "0.25"
        }
      },
      {
        "id": 2,
        "type": "message",
        "x": 400,
        "y": 60,
        "params": {
          "text": "0.75"
        }
      },
      {
        "id": 3,
        "type": "signal_multiply",
        "x": 160,
        "y": 160,
        "params": {
          "rhs": 0.5
        }
      },
      {
        "id": 4,
        "type": "snapshot",
        "x": 160,
        "y": 270,
        "params": {
          "interval": 100,
          "offset": 0
        }
      },
      {
        "id": 5,
        "type": "print",
        "x": 160,
        "y": 360,
        "params": {
          "label": "signal_multiply",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 1
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 4,
        "outlet": 0,
        "to": 5,
        "inlet": 0
      }
    ]
  },
  "signal_divide": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "sig",
        "x": 160,
        "y": 60,
        "params": {
          "args": "0.25"
        }
      },
      {
        "id": 2,
        "type": "message",
        "x": 400,
        "y": 60,
        "params": {
          "text": "0.75"
        }
      },
      {
        "id": 3,
        "type": "signal_divide",
        "x": 160,
        "y": 160,
        "params": {
          "rhs": 2
        }
      },
      {
        "id": 4,
        "type": "snapshot",
        "x": 160,
        "y": 270,
        "params": {
          "interval": 100,
          "offset": 0
        }
      },
      {
        "id": 5,
        "type": "print",
        "x": 160,
        "y": 360,
        "params": {
          "label": "signal_divide",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 1
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 4,
        "outlet": 0,
        "to": 5,
        "inlet": 0
      }
    ]
  },
  "cycle": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 160,
        "y": 60,
        "params": {
          "text": "4"
        }
      },
      {
        "id": 2,
        "type": "cycle",
        "x": 160,
        "y": 160,
        "params": {
          "frequency": 2,
          "phase": 0
        }
      },
      {
        "id": 3,
        "type": "snapshot",
        "x": 160,
        "y": 270,
        "params": {
          "interval": 100,
          "offset": 0
        }
      },
      {
        "id": 4,
        "type": "print",
        "x": 160,
        "y": 360,
        "params": {
          "label": "cycle",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 2,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      }
    ]
  },
  "phasor": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 160,
        "y": 60,
        "params": {
          "text": "4"
        }
      },
      {
        "id": 2,
        "type": "phasor",
        "x": 160,
        "y": 160,
        "params": {
          "frequency": 1,
          "phase": 0
        }
      },
      {
        "id": 3,
        "type": "snapshot",
        "x": 160,
        "y": 270,
        "params": {
          "interval": 100,
          "offset": 0
        }
      },
      {
        "id": 4,
        "type": "print",
        "x": 160,
        "y": 360,
        "params": {
          "label": "phasor",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 2,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      }
    ]
  },
  "noise": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "noise",
        "x": 160,
        "y": 120,
        "params": {}
      },
      {
        "id": 2,
        "type": "snapshot",
        "x": 160,
        "y": 230,
        "params": {
          "interval": 100,
          "offset": 0
        }
      },
      {
        "id": 3,
        "type": "print",
        "x": 160,
        "y": 320,
        "params": {
          "label": "noise",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 2,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      }
    ]
  },
  "signal_clip": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 160,
        "y": 60,
        "params": {
          "text": "-2"
        }
      },
      {
        "id": 2,
        "type": "sig",
        "x": 160,
        "y": 150,
        "params": {
          "args": "2"
        }
      },
      {
        "id": 3,
        "type": "signal_clip",
        "x": 160,
        "y": 240,
        "params": {
          "minimum": -1,
          "maximum": 1
        }
      },
      {
        "id": 4,
        "type": "snapshot",
        "x": 160,
        "y": 330,
        "params": {
          "interval": 100,
          "offset": 0
        }
      },
      {
        "id": 5,
        "type": "print",
        "x": 160,
        "y": 420,
        "params": {
          "label": "signal_clip",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 2,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 4,
        "outlet": 0,
        "to": 5,
        "inlet": 0
      }
    ]
  },
  "line_signal": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 160,
        "y": 60,
        "params": {
          "text": "1 1000"
        }
      },
      {
        "id": 2,
        "type": "message",
        "x": 400,
        "y": 60,
        "params": {
          "text": "0 500"
        }
      },
      {
        "id": 3,
        "type": "line_signal",
        "x": 160,
        "y": 160,
        "params": {
          "value": 0,
          "time": 0
        }
      },
      {
        "id": 4,
        "type": "print",
        "x": 430,
        "y": 270,
        "params": {
          "label": "ramp-complete",
          "level": 0,
          "popup": 0
        }
      },
      {
        "id": 5,
        "type": "snapshot",
        "x": 160,
        "y": 270,
        "params": {
          "interval": 100,
          "offset": 0
        }
      },
      {
        "id": 6,
        "type": "print",
        "x": 160,
        "y": 360,
        "params": {
          "label": "line_signal",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 1,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 5,
        "inlet": 0
      },
      {
        "from": 5,
        "outlet": 0,
        "to": 6,
        "inlet": 0
      }
    ]
  },
  "snapshot": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "cycle",
        "x": 160,
        "y": 60,
        "params": {
          "frequency": 1,
          "phase": 0
        }
      },
      {
        "id": 2,
        "type": "message",
        "x": 420,
        "y": 60,
        "params": {
          "text": "bang"
        }
      },
      {
        "id": 3,
        "type": "snapshot",
        "x": 160,
        "y": 170,
        "params": {
          "interval": 100,
          "offset": 0
        }
      },
      {
        "id": 4,
        "type": "message",
        "x": 420,
        "y": 160,
        "params": {
          "text": "0"
        }
      },
      {
        "id": 5,
        "type": "print",
        "x": 160,
        "y": 280,
        "params": {
          "label": "sample",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 4,
        "outlet": 0,
        "to": 3,
        "inlet": 1
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 5,
        "inlet": 0
      }
    ]
  },
  "signal_dac": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "cycle",
        "x": 160,
        "y": 60,
        "params": {
          "frequency": 220,
          "phase": 0
        }
      },
      {
        "id": 2,
        "type": "signal_multiply",
        "x": 160,
        "y": 150,
        "params": {
          "rhs": 0.02
        }
      },
      {
        "id": 3,
        "type": "signal_dac",
        "x": 160,
        "y": 260,
        "params": {
          "channels": "1 2"
        }
      },
      {
        "id": 4,
        "type": "snapshot",
        "x": 450,
        "y": 260,
        "params": {
          "interval": 100,
          "offset": 0
        }
      },
      {
        "id": 5,
        "type": "print",
        "x": 450,
        "y": 350,
        "params": {
          "label": "output-sample",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 2,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 1
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 4,
        "outlet": 0,
        "to": 5,
        "inlet": 0
      }
    ]
  },
  "inlet": {
    "version": 2,
    "profile": "ultra-patcher-v2",
    "nodes": [
      {
        "id": 3,
        "type": "inlet",
        "x": 60,
        "y": 50,
        "params": {}
      },
      {
        "id": 4,
        "type": "signal_add",
        "x": 60,
        "y": 120,
        "params": {
          "rhs": 10
        }
      },
      {
        "id": 5,
        "type": "outlet",
        "x": 60,
        "y": 190,
        "params": {}
      }
    ],
    "edges": [
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 4,
        "outlet": 0,
        "to": 5,
        "inlet": 0
      }
    ]
  },
  "outlet": {
    "version": 2,
    "profile": "ultra-patcher-v2",
    "nodes": [
      {
        "id": 3,
        "type": "inlet",
        "x": 60,
        "y": 50,
        "params": {}
      },
      {
        "id": 4,
        "type": "signal_add",
        "x": 60,
        "y": 120,
        "params": {
          "rhs": 10
        }
      },
      {
        "id": 5,
        "type": "outlet",
        "x": 60,
        "y": 190,
        "params": {}
      }
    ],
    "edges": [
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 4,
        "outlet": 0,
        "to": 5,
        "inlet": 0
      }
    ]
  },
  "number_int": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 80,
        "y": 60,
        "params": {
          "text": "-3.9"
        }
      },
      {
        "id": 2,
        "type": "number_int",
        "x": 80,
        "y": 140,
        "params": {
          "value": 0,
          "minimum": -20,
          "maximum": 20
        }
      },
      {
        "id": 3,
        "type": "print",
        "x": 80,
        "y": 235,
        "params": {
          "label": "integer",
          "level": 0,
          "popup": 0
        }
      },
      {
        "id": 4,
        "type": "print",
        "x": 300,
        "y": 235,
        "params": {
          "label": "physical-tab",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 2,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 1,
        "to": 4,
        "inlet": 0
      }
    ]
  },
  "message_box": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 60,
        "y": 60,
        "params": {
          "text": "8 9"
        }
      },
      {
        "id": 2,
        "type": "bang",
        "x": 240,
        "y": 60,
        "params": {}
      },
      {
        "id": 3,
        "type": "message",
        "x": 400,
        "y": 60,
        "params": {
          "text": "5 pear 2.25"
        }
      },
      {
        "id": 4,
        "type": "message",
        "x": 600,
        "y": 60,
        "params": {
          "text": "set"
        }
      },
      {
        "id": 5,
        "type": "message_box",
        "x": 240,
        "y": 160,
        "params": {
          "text": "saved $1 $2"
        }
      },
      {
        "id": 6,
        "type": "print",
        "x": 240,
        "y": 270,
        "params": {
          "label": "message-box",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 5,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 5,
        "inlet": 0
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 5,
        "inlet": 1
      },
      {
        "from": 4,
        "outlet": 0,
        "to": 5,
        "inlet": 0
      },
      {
        "from": 5,
        "outlet": 0,
        "to": 6,
        "inlet": 0
      }
    ]
  },
  "patcher": {
    "version": 2,
    "profile": "ultra-patcher-v2",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 60,
        "y": 50,
        "params": {
          "text": "7"
        }
      },
      {
        "id": 2,
        "type": "patcher",
        "x": 60,
        "y": 140,
        "params": {
          "name": "basic"
        },
        "patcher": {
          "nodes": [
            {
              "id": 3,
              "type": "inlet",
              "x": 60,
              "y": 50,
              "params": {}
            },
            {
              "id": 4,
              "type": "signal_add",
              "x": 60,
              "y": 120,
              "params": {
                "rhs": 10
              }
            },
            {
              "id": 5,
              "type": "outlet",
              "x": 60,
              "y": 190,
              "params": {}
            }
          ],
          "edges": [
            {
              "from": 3,
              "outlet": 0,
              "to": 4,
              "inlet": 0
            },
            {
              "from": 4,
              "outlet": 0,
              "to": 5,
              "inlet": 0
            }
          ]
        }
      },
      {
        "id": 6,
        "type": "snapshot",
        "x": 60,
        "y": 230,
        "params": {
          "interval": 0,
          "offset": 0
        }
      },
      {
        "id": 7,
        "type": "comment",
        "x": 200,
        "y": 50,
        "params": {
          "text": "Double-click p basic to enter. All objects share this document runtime."
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 2,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 6,
        "inlet": 0
      }
    ]
  },
  "comment": {
    "version": 2,
    "profile": "ultra-patcher-v2",
    "nodes": [
      {
        "id": 1,
        "type": "message",
        "x": 60,
        "y": 50,
        "params": {
          "text": "7"
        }
      },
      {
        "id": 2,
        "type": "patcher",
        "x": 60,
        "y": 140,
        "params": {
          "name": "basic"
        },
        "patcher": {
          "nodes": [
            {
              "id": 3,
              "type": "inlet",
              "x": 60,
              "y": 50,
              "params": {}
            },
            {
              "id": 4,
              "type": "signal_add",
              "x": 60,
              "y": 120,
              "params": {
                "rhs": 10
              }
            },
            {
              "id": 5,
              "type": "outlet",
              "x": 60,
              "y": 190,
              "params": {}
            }
          ],
          "edges": [
            {
              "from": 3,
              "outlet": 0,
              "to": 4,
              "inlet": 0
            },
            {
              "from": 4,
              "outlet": 0,
              "to": 5,
              "inlet": 0
            }
          ]
        }
      },
      {
        "id": 6,
        "type": "snapshot",
        "x": 60,
        "y": 230,
        "params": {
          "interval": 0,
          "offset": 0
        }
      },
      {
        "id": 7,
        "type": "comment",
        "x": 200,
        "y": 50,
        "params": {
          "text": "Double-click p basic to enter. All objects share this document runtime."
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 2,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 6,
        "inlet": 0
      }
    ]
  },
  "subtract": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message_box",
        "x": 80,
        "y": 60,
        "params": {
          "text": "7"
        }
      },
      {
        "id": 2,
        "type": "message_box",
        "x": 300,
        "y": 60,
        "params": {
          "text": "4"
        }
      },
      {
        "id": 3,
        "type": "bang",
        "x": 80,
        "y": 130,
        "params": {}
      },
      {
        "id": 4,
        "type": "subtract",
        "x": 80,
        "y": 220,
        "params": {
          "rhs": 2,
          "numericmode": 2
        }
      },
      {
        "id": 5,
        "type": "print",
        "x": 80,
        "y": 320,
        "params": {
          "label": "subtract",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 4,
        "inlet": 1
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 4,
        "outlet": 0,
        "to": 5,
        "inlet": 0
      }
    ]
  },
  "divide": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message_box",
        "x": 80,
        "y": 60,
        "params": {
          "text": "7"
        }
      },
      {
        "id": 2,
        "type": "message_box",
        "x": 300,
        "y": 60,
        "params": {
          "text": "4"
        }
      },
      {
        "id": 3,
        "type": "bang",
        "x": 80,
        "y": 130,
        "params": {}
      },
      {
        "id": 4,
        "type": "divide",
        "x": 80,
        "y": 220,
        "params": {
          "rhs": 2,
          "numericmode": 2
        }
      },
      {
        "id": 5,
        "type": "print",
        "x": 80,
        "y": 320,
        "params": {
          "label": "divide",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 4,
        "inlet": 1
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 4,
        "outlet": 0,
        "to": 5,
        "inlet": 0
      }
    ]
  },
  "modulo": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message_box",
        "x": 80,
        "y": 60,
        "params": {
          "text": "7"
        }
      },
      {
        "id": 2,
        "type": "message_box",
        "x": 300,
        "y": 60,
        "params": {
          "text": "4"
        }
      },
      {
        "id": 3,
        "type": "bang",
        "x": 80,
        "y": 130,
        "params": {}
      },
      {
        "id": 4,
        "type": "modulo",
        "x": 80,
        "y": 220,
        "params": {
          "rhs": 3,
          "numericmode": 1
        }
      },
      {
        "id": 5,
        "type": "print",
        "x": 80,
        "y": 320,
        "params": {
          "label": "modulo",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 4,
        "inlet": 1
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 4,
        "outlet": 0,
        "to": 5,
        "inlet": 0
      }
    ]
  },
  "reverse_subtract": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message_box",
        "x": 80,
        "y": 60,
        "params": {
          "text": "7"
        }
      },
      {
        "id": 2,
        "type": "message_box",
        "x": 300,
        "y": 60,
        "params": {
          "text": "4"
        }
      },
      {
        "id": 3,
        "type": "bang",
        "x": 80,
        "y": 130,
        "params": {}
      },
      {
        "id": 4,
        "type": "reverse_subtract",
        "x": 80,
        "y": 220,
        "params": {
          "rhs": 10,
          "numericmode": 2
        }
      },
      {
        "id": 5,
        "type": "print",
        "x": 80,
        "y": 320,
        "params": {
          "label": "reverse_subtract",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 4,
        "inlet": 1
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 4,
        "outlet": 0,
        "to": 5,
        "inlet": 0
      }
    ]
  },
  "reverse_divide": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message_box",
        "x": 80,
        "y": 60,
        "params": {
          "text": "7"
        }
      },
      {
        "id": 2,
        "type": "message_box",
        "x": 300,
        "y": 60,
        "params": {
          "text": "4"
        }
      },
      {
        "id": 3,
        "type": "bang",
        "x": 80,
        "y": 130,
        "params": {}
      },
      {
        "id": 4,
        "type": "reverse_divide",
        "x": 80,
        "y": 220,
        "params": {
          "rhs": 14,
          "numericmode": 2
        }
      },
      {
        "id": 5,
        "type": "print",
        "x": 80,
        "y": 320,
        "params": {
          "label": "reverse_divide",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 4,
        "inlet": 1
      },
      {
        "from": 3,
        "outlet": 0,
        "to": 4,
        "inlet": 0
      },
      {
        "from": 4,
        "outlet": 0,
        "to": 5,
        "inlet": 0
      }
    ]
  },
  "abs": {
    "version": 1,
    "profile": "ultra-canvas-v1",
    "nodes": [
      {
        "id": 1,
        "type": "message_box",
        "x": 80,
        "y": 60,
        "params": {
          "text": "-7.5"
        }
      },
      {
        "id": 2,
        "type": "abs",
        "x": 80,
        "y": 180,
        "params": {
          "numericmode": 2
        }
      },
      {
        "id": 3,
        "type": "print",
        "x": 80,
        "y": 300,
        "params": {
          "label": "abs",
          "level": 0,
          "popup": 0
        }
      }
    ],
    "edges": [
      {
        "from": 1,
        "outlet": 0,
        "to": 2,
        "inlet": 0
      },
      {
        "from": 2,
        "outlet": 0,
        "to": 3,
        "inlet": 0
      }
    ]
  }
};
