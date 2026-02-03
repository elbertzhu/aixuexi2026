import SwiftUI

struct ResultView: View {
    let score: Int
    let total: Int
    let analysis: String
    let onRestart: () -> Void
    
    var body: some View {
        VStack(spacing: 30) {
            Spacer()
            
            Text("测试完成")
                .font(.largeTitle)
                .fontWeight(.bold)
            
            Text("你的得分")
                .font(.headline)
                .foregroundColor(.gray)
            
            Text("\(score) / \(total)")
                .font(.system(size: 60, weight: .bold, design: .rounded))
                .foregroundColor(score > total/2 ? .green : .orange)
            
            Text(analysis)
                .font(.callout)
                .multilineTextAlignment(.center)
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            
            Spacer()
            
            Button(action: onRestart) {
                Text("再测一次")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
            }
            .padding(.horizontal, 40)
            .padding(.bottom, 50)
        }
    }
}

// MARK: - Preview
struct ResultView_Previews: PreviewProvider {
    static var previews: some View {
        ResultView(
            score: 8,
            total: 10,
            analysis: "Good job! Keep practicing.",
            onRestart: {}
        )
    }
}
