// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "AIXueXi",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .executable(
            name: "AIXueXi",
            targets: ["AIXueXi"]
        )
    ],
    targets: [
        .executableTarget(
            name: "AIXueXi",
            dependencies: [],
            path: "Sources"
        )
    ]
)
