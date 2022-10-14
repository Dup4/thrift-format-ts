enum ErrorEnum {
    OK = 0,
    NOT_FOUND = 404,
    INTERNAL_ERROR = 500,
}

const map<ErrorEnum, string> ErrorEnumStr = {
    ErrorEnum.OK: "OK",
    ErrorEnum.NOT_FOUND: "NOT_FOUND",
    ErrorEnum.INTERNAL_ERROR: "INTERNAL_ERROR",
}
