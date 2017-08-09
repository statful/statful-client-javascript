module.exports = {
    "env": {
        "browser": true,
        "node": true,
        "es6": true,
        "jasmine": true
    },
    "globals": {
      "StatfulUtil": true,
      "StatfulLogger": true,
      "statful": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "sourceType": "module"
    },
    "rules": {
        "indent": [
            "error",
            4
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ]
    }
};
