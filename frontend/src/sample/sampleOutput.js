export default {
  code: `var _5WzzDDbKc63R20cmPO4tV_0_ = 1080;

const _5WzzDDbKc63R20cmPO4tV_5_ = _5WzzDDbKc63R20cmPO4tV_4_("hey");

if (window.screen.availWidth == _5WzzDDbKc63R20cmPO4tV_0_) {
  console.log("Yes");
}

function _5WzzDDbKc63R20cmPO4tV_1_(_5WzzDDbKc63R20cmPO4tV_6_, _5WzzDDbKc63R20cmPO4tV_7_) {
  var _5WzzDDbKc63R20cmPO4tV_8_ = [];
  var _5WzzDDbKc63R20cmPO4tV_9_ = _5WzzDDbKc63R20cmPO4tV_6_.length;
  var _5WzzDDbKc63R20cmPO4tV_10_ = 0;
  for (; _5WzzDDbKc63R20cmPO4tV_10_ < _5WzzDDbKc63R20cmPO4tV_9_; _5WzzDDbKc63R20cmPO4tV_10_ += _5WzzDDbKc63R20cmPO4tV_7_) {
    if (_5WzzDDbKc63R20cmPO4tV_10_ + _5WzzDDbKc63R20cmPO4tV_7_ < _5WzzDDbKc63R20cmPO4tV_9_) {
      _5WzzDDbKc63R20cmPO4tV_8_.push(_5WzzDDbKc63R20cmPO4tV_6_.substring(_5WzzDDbKc63R20cmPO4tV_10_, _5WzzDDbKc63R20cmPO4tV_10_ + _5WzzDDbKc63R20cmPO4tV_7_));
    } else {
      _5WzzDDbKc63R20cmPO4tV_8_.push(_5WzzDDbKc63R20cmPO4tV_6_.substring(_5WzzDDbKc63R20cmPO4tV_10_, _5WzzDDbKc63R20cmPO4tV_9_));
    }
  }
  return _5WzzDDbKc63R20cmPO4tV_8_;
}

function _5WzzDDbKc63R20cmPO4tV_2_(_5WzzDDbKc63R20cmPO4tV_11_) {
  var _5WzzDDbKc63R20cmPO4tV_12_ = _5WzzDDbKc63R20cmPO4tV_11_[1];
  if (_5WzzDDbKc63R20cmPO4tV_11_[0]) {
    _5WzzDDbKc63R20cmPO4tV_12_ += _5WzzDDbKc63R20cmPO4tV_2_(_5WzzDDbKc63R20cmPO4tV_11_[0]);
  }
  if (_5WzzDDbKc63R20cmPO4tV_11_[2]) {
    _5WzzDDbKc63R20cmPO4tV_12_ += _5WzzDDbKc63R20cmPO4tV_2_(_5WzzDDbKc63R20cmPO4tV_11_[2]);
  }
  return _5WzzDDbKc63R20cmPO4tV_12_;
}

function _5WzzDDbKc63R20cmPO4tV_3_(_5WzzDDbKc63R20cmPO4tV_13_, _5WzzDDbKc63R20cmPO4tV_14_, _5WzzDDbKc63R20cmPO4tV_15_) {
  _5WzzDDbKc63R20cmPO4tV_14_.open("GET", _5WzzDDbKc63R20cmPO4tV_13_, false);
  _5WzzDDbKc63R20cmPO4tV_14_.send(_5WzzDDbKc63R20cmPO4tV_15_);
}`,
  renames: [
    {
      id: "_5WzzDDbKc63R20cmPO4tV_0_",
      name: "m",
      candidates: ["m", "asdf", "maaaa"]
    },
    {
      id: "_5WzzDDbKc63R20cmPO4tV_1_",
      name: "chunkData",
      candidates: ["chunkData", "asdf", "chunkDataaaaa"]
    },
    {
      id: "_5WzzDDbKc63R20cmPO4tV_2_",
      name: "sumTree",
      candidates: ["sumTree", "asdf", "sumTreeaaaa"]
    },
    {
      id: "_5WzzDDbKc63R20cmPO4tV_3_",
      name: "sendRequest",
      candidates: ["sendRequest", "asdf", "sendRequestaaaa"]
    },
    {
      id: "_5WzzDDbKc63R20cmPO4tV_4_",
      name: "require",
      candidates: ["require", "asdf", "requireaaaa"]
    },
    {
      id: "_5WzzDDbKc63R20cmPO4tV_5_",
      name: "hey",
      candidates: ["hey", "asdf", "heyaaaa"]
    },
    {
      id: "_5WzzDDbKc63R20cmPO4tV_6_",
      name: "e",
      candidates: ["e", "asdf", "eaaaa"]
    },
    {
      id: "_5WzzDDbKc63R20cmPO4tV_7_",
      name: "t",
      candidates: ["t", "asdf", "taaaa"]
    },
    {
      id: "_5WzzDDbKc63R20cmPO4tV_8_",
      name: "n",
      candidates: ["n", "asdf", "naaaa"]
    },
    {
      id: "_5WzzDDbKc63R20cmPO4tV_9_",
      name: "r",
      candidates: ["r", "asdf", "raaaa"]
    },
    {
      id: "_5WzzDDbKc63R20cmPO4tV_10_",
      name: "i",
      candidates: ["i", "asdf", "iaaaa"]
    },
    {
      id: "_5WzzDDbKc63R20cmPO4tV_11_",
      name: "t",
      candidates: ["t", "asdf", "taaaa"]
    },
    {
      id: "_5WzzDDbKc63R20cmPO4tV_12_",
      name: "c",
      candidates: ["c", "asdf", "caaaa"]
    },
    {
      id: "_5WzzDDbKc63R20cmPO4tV_13_",
      name: "a",
      candidates: ["a", "asdf", "aaaaa"]
    },
    {
      id: "_5WzzDDbKc63R20cmPO4tV_14_",
      name: "b",
      candidates: ["b", "asdf", "baaaa"]
    },
    {
      id: "_5WzzDDbKc63R20cmPO4tV_15_",
      name: "c",
      candidates: ["c", "asdf", "caaaa"]
    }
  ]
}