import SwiftUI

struct QuestionView: View {
    let question: Question
    let onAnswer: (String) -> Void
    
    var body: some View {
        VStack(spacing: 20) {
            // Progress Bar
            ProgressView(value: Double(question.id.hashValue), total: 100) // Mock progress
            
            Text(question.prompt)
                .font(.title2)
                .fontWeight(.medium)
                .padding(.top)
            
            Spacer()
            
            // Options
            VStack(spacing: 12) {
                ForEach(question.options, id: \.self) { option in
                    Button(action: {
                        onAnswer(option)
                    }) {
                        Text(option)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
            
            Spacer()
        }
    }
}

// MARK: - Preview
struct QuestionView_Previews: PreviewProvider {
    static var previews: some View {
        QuestionView(
            question: Question(id: "1", prompt: "Sample Question?", options: ["A", "B", "C"], correctAnswer: "A", difficulty: 1),
            onAnswer: { _ in }
        )
    }
}
