export default function IdeaLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダースケルトン */}
        <div className="mb-8 animate-pulse">
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-4"></div>
          <div className="h-10 w-3/4 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </div>

        {/* コンテンツスケルトン */}
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-lg animate-pulse">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-3"></div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded"></div>
                <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-800 rounded"></div>
                <div className="h-4 w-4/6 bg-gray-200 dark:bg-gray-800 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}