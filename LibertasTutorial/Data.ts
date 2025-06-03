// Libertas time series data API.
const DataQA_Schema: LibertasAvroSchema[] = [
    <LibertasAvroSchemaEnum>
    {
        "type": "enum",
        "name": "DayOfWeek",
        "symbols": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    },
    <LibertasAvroSchemaRecord>
    {
        "type": "record",
        "name": "TreeNode",
        "fields": [
            { "name": "value", "type": "string" },
            { "name": "children", "type": ["null", { "type": "array", "items": "TreeNode" }] }
        ]
    },
    <LibertasAvroSchemaRecord>
    {
        "type": "record",
        "name": "Tree",
        "fields": [
            { "name": "timestamp", "type": "double" },
            { "name": "index", "type": "long" },
            { "name": "dow", "type": "DayOfWeek" },
            { "name": "value", "type": "string" },
            { "name": "children", "type": ["null", { "type": "array", "items": "TreeNode" }] }
        ]
    },
];

enum DayOfWeek {
    Sun, Mon, Tue, Wed, Thu, Fri, Sat
}

declare interface Tree {
    timestamp: number;
    index: number;
    dow: string;
    value: string;
    children?: TreeNode[];
}

declare interface TreeNode {
    value: string;
    children?: TreeNode[];
}

export function DataQA(verify: boolean) {
    Libertas_DataInitSchema(DataQA_Schema);
    const db = Libertas_DataOpenTimeSeries("main", true)!;
    const [size, start] = Libertas_DataStatTimeSeries(db);
    console.log("Time series start=", start, "size=", size);
    if (verify) {
        let verified = true;
        for (let i = start; i < size; i++) {
            const [index, value] = Libertas_DataReadTimeSeries(db, i, i)[0];
            const t = value as Tree;
            if (index != value.index) {
                verified = false;
                break;
            }
        }
        console.log("Verification result", verified);
    } else {
        for (let i = 0; i < 100; i++) {
            const index = i + size;
            const treeVal: Tree = {
                timestamp: os.utcnow(),
                index: index,
                dow: DayOfWeek[index % 7],
                value: "Root",
                children: [
                    { value: "1-1" },
                    {
                        value: "1-2", children: [
                            { value: "2-1" },
                            { value: "2-2" },
                            { value: "2-3" },
                        ]
                    },
                    { value: "1-3" },
                ]
            }
            // Index of Tree in schema is 2 (zero based)
            Libertas_DataWriteTimeSeries(db, treeVal, 2);
        }
    }
}
