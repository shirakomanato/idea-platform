import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(request: NextRequest) {
  try {
    const { title, target, why } = await request.json()

    // 入力値の検証
    if (!title || !target || !why) {
      return NextResponse.json(
        { error: 'タイトル、ターゲット、Whyが必要です' },
        { status: 400 }
      )
    }

    // OpenAI APIキーの確認
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey || !apiKey.startsWith('sk-')) {
      return NextResponse.json(
        { error: 'OpenAI APIキーが正しく設定されていません' },
        { status: 500 }
      )
    }

    // プロンプトの作成
    const prompt = `
あなたは優秀なビジネスコンサルタント兼技術アドバイザーです。以下のアイデアについて、具体的で実行可能な提案をしてください。

## 入力情報
タイトル: ${title}
ターゲット: ${target}  
Why（なぜ必要か）: ${why}

## 回答形式
以下の形式で、実用的で具体的な提案をしてください：

What: [2-3文で具体的なソリューションやプロダクトを説明]

How: [技術スタック、実装方法、開発アプローチを3-4文で説明]

Impact: [期待される効果、数値目標、ビジネスへの影響を2-3文で説明]

## 回答の制約
- 各項目は実現可能で具体的な内容にする
- 技術的な詳細も含める
- 数値目標は現実的な範囲で設定する
- 日本語で回答する
`

    // OpenAI API呼び出し
    const { text } = await generateText({
      model: openai('gpt-4o'),
      prompt,
      maxTokens: 800,
      temperature: 0.7,
    })

    // レスポンスのパース
    const sections = {
      what: '',
      how: '', 
      impact: ''
    }

    const lines = text.split('\n').filter(line => line.trim())
    
    for (const line of lines) {
      if (line.startsWith('What:')) {
        sections.what = line.replace('What:', '').trim()
      } else if (line.startsWith('How:')) {
        sections.how = line.replace('How:', '').trim()
      } else if (line.startsWith('Impact:')) {
        sections.impact = line.replace('Impact:', '').trim()
      }
    }

    // より柔軟なパースロジック
    if (!sections.what || !sections.how || !sections.impact) {
      // セクション分けに失敗した場合の代替パース
      const textParts = text.split(/What:|How:|Impact:/i)
      if (textParts.length >= 4) {
        sections.what = textParts[1]?.trim() || ''
        sections.how = textParts[2]?.trim() || ''
        sections.impact = textParts[3]?.trim() || ''
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        what: sections.what,
        how: sections.how,
        impact: sections.impact,
        fullText: text
      }
    })

  } catch (error) {
    console.error('AI生成エラー:', error)
    
    return NextResponse.json(
      { 
        error: 'AI生成に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
}