// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "AIXueXi",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(
            name: "AIXueXi",
            targets: ["AIXueXi"]
        )
    ],
    targets: [
        .target(
            name: "AIXueXi",
            dependencies: [],
            path: "Sources"
        )
    ]
)
