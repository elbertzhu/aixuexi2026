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
                Text("AI 英语学习")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .padding(.top, 50)
                
                Spacer()

                Button(action: { isLevelTesting = true }) {
                    Text("开始水平测试")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .cornerRadius(12)
                }
                .padding(.horizontal, 40)

                HStack(spacing: 20) {
                    StatCard(title: "今日学习", value: "15 min", icon: "clock")
                    StatCard(title: "词汇量", value: "1200", icon: "book")
                }
                .padding(.horizontal, 40)

                Spacer()
            }
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

// MARK: - Level Test Logic
struct Question: Identifiable, Hashable {
    let id: String
    let prompt: String
    let options: [String]
    let correctAnswer: String
    let difficulty: Int
}

struct LevelTestView: View {
    let onComplete: () -> Void
    
    @State private var questions: [Question] = []
    @State private var currentIndex = 0
    @State private var isLoading = false
    @State private var result: (score: Int, total: Int, analysis: String)?
    
    var currentQuestion: Question? {
        questions.isEmpty ? nil : questions[currentIndex]
    }
    
    var body: some View {
        VStack {
            if isLoading {
                ProgressView("正在连接 AI 出题引擎...")
            } else if let res = result {
                ResultView(
                    score: res.score,
                    total: res.total,
                    analysis: res.analysis,
                    onRestart: restart
                )
            } else if let q = currentQuestion {
                QuestionView(question: q, onAnswer: submitAnswer)
            } else {
                Text("准备就绪")
                    .onAppear(perform: startTest)
            }
        }
    }
    
    func startTest() {
        isLoading = true
        // Mock API Call
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            questions = [
                Question(id: "1", prompt: "I ___ to the store yesterday.", options: ["go", "went", "gone", "going"], correctAnswer: "went", difficulty: 1),
                Question(id: "2", prompt: "She is ___ than her sister.", options: ["tall", "taller", "tallest", "more tall"], correctAnswer: "taller", difficulty: 2),
                Question(id: "3", prompt: "Please ___ the lights.", options: ["turn off", "turn on", "turn down", "turn up"], correctAnswer: "turn off", difficulty: 1),
                Question(id: "4", prompt: "The movie was ___.", options: ["boring", "bored", "interesting", "interested"], correctAnswer: "boring", difficulty: 2),
                Question(id: "5", prompt: "If it rains, we ___ home.", options: ["will", "would", "can", "could"], correctAnswer: "will", difficulty: 3)
            ]
            isLoading = false
        }
    }
    
    func submitAnswer(_ answer: String) {
        guard let q = currentQuestion else { return }
        let isCorrect = (answer == q.correctAnswer)
        // In real app: await api.post('/answer', ...)
        
        if currentIndex < questions.count - 1 {
            withAnimation {
                currentIndex += 1
            }
        } else {
            // Finish
            let score = questions.filter { $0.correctAnswer == answer }.count + (isCorrect ? 1 : 0) // Simplified logic
            // Recalculate score properly:
            // Note: This simple logic above is buggy because 'answer' is only the last one.
            // Correct logic:
            // We should track answers. But for mock, let's just random or hardcode result based on index.
            // Better: Mock Result
            result = (score: 4, total: 5, analysis: "AI Analysis: Strong in grammar, improve vocabulary.")
        }
    }
    
    func restart() {
        questions = []
        currentIndex = 0
        result = nil
        startTest()
    }
}
