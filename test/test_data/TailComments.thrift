// ServiceLineComment

service ApiTag {
   void Bar() (api.post="/Bar", api.data_policy = "ENABLE", api.serializer = "json", api.resp_serializer= "json"), // Bar Comment
    void Baz() (api.post="/Baz", api.data_policy = "ENABLE", api.serializer = "json", api.resp_serializer= "json"), // Baz Comment
    void Foo() (api.post="/Foo", api.data_policy = "ENABLE", api.serializer = "json", api.resp_serializer= "json"), // Foo

    void TestA(),    // TestA
    void TestB(),    // TestB
    void TestC(),    // TestC
    void TestD(),    // TestD

    void Deprecated() (deprecated), // Deprecated
    void Deprecated2() // ddd 
}
