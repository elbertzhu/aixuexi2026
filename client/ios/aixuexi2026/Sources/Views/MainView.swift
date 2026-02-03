import SwiftUI

// MARK: - Main Entry Point
@main
struct AixuexiApp: App {
    var body: some Scene {
        WindowGroup {
            MainView()
        }
    }
}

// MARK: - Main View
struct MainView: View {
    @State private var isLevelTesting = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                // Header
                Text("AI 英语学习")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Spacer()

                // Start Button
                Button(action: {
                    isLevelTesting = true
                }) {
                    Text("开始水平测试")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .cornerRadius(12)
                }
                .padding(.horizontal, 40)

                // Dashboard Preview
                HStack(spacing: 20) {
                    StatCard(title: "今日学习", value: "15 min", icon: "clock")
                    StatCard(title: "词汇量", value: "1200", icon: "book")
                }
                .padding(.horizontal, 40)

                Spacer()
            }
            .padding()
            .fullScreenCover(isPresented: $isLevelTesting) {
                LevelTestView(onComplete: {
                    isLevelTesting = false
                })
            }
        }
    }
}

// MARK: - Helper Views
struct StatCard: View {
    let title: String
    let value: String
    let icon: String

    var body: some View {
        VStack {
            Image(systemName: icon)
                .font(.title)
                .foregroundColor(.blue)
            Text(value)
                .font(.headline)
            Text(title)
                .font(.caption)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - Preview Provider
struct MainView_Previews: PreviewProvider {
    static var previews: some View {
        MainView()
    }
}
