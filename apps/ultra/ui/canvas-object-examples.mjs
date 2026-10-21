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
  }
};
