import { test, expect } from '@playwright/test';

test.describe('API テストの各種パターン', () => {

  // APIのベースURL（環境ファイルから取得、未設定ならデフォルト値を使用）
  const baseUrl = process.env.BASE_URL || 'https://jsonplaceholder.typicode.com';

  // 1. GET リクエスト（データ取得）のテスト
  test('GET: 記事一覧と特定の記事が正常に取得できること', async ({ request }) => {
    const response = await request.get(`${baseUrl}/posts/1`);

    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body.id).toBe(1);
    expect(body).toHaveProperty('title');
    expect(body).toHaveProperty('userId');
  });

  // 2. POST リクエスト（データ作成）のテスト
  test('POST: 新しい記事を正常に投稿できること', async ({ request }) => {
    const newPost = {
      title: 'PlaywrightでつくるAPIテスト',
      body: 'HTTPリクエストも簡単にテストできます',
      userId: 1,
    };

    const response = await request.post(`${baseUrl}/posts`, {
      data: newPost,
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
    });

    expect(response.status()).toBe(201);

    const body = await response.json();
    
    expect(body.title).toBe(newPost.title);
    expect(body.body).toBe(newPost.body);
    expect(body.id).toBeDefined();
  });

  // 3. DELETE リクエスト（削除）のテスト
  test('DELETE: 記事を削除できること', async ({ request }) => {
    const response = await request.delete(`${baseUrl}/posts/1`);

    expect(response.status()).toBe(200);
  });

});