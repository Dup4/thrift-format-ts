typedef map<string, Bonk> MapType

struct OptionalSetDefaultTest {
    1: optional set<string> with_default = ["test", "testb"],
}
