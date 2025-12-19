ToDo Money (Backend)

ToDo（タスク）を完了すると「目標年収価値」を日割り・按分して報酬（通貨イベント）として記録し、集計 API で可視化できる Spring Boot + JWT + PostgreSQL バックエンドです。
「やったこと＝価値」に変換して積み上がる実感（Money/Reward）を作ることを狙っています。

目次

1. 概要

2. 実現していること

3. 技術スタック

4. アーキテクチャ

5. データモデル

6. 認証・認可

7. API 仕様

8. ローカル起動手順

9. 動作デモ（curl 一連）

10. 今回ぶち当たった壁とキーポイント

11. ディレクトリ構成

12. 今後の拡張案

1. 概要
目的

タスク完了を 「報酬（通貨イベント）」に変換して記録し、継続のモチベーションを上げる

API を JWT（ステートレス） で保護し、Web/iOS など複数クライアントから安全に利用できるようにする

コアの価値計算（実装に一致）

Goal に annualIncome（年換算価値）を持たせ、日割り → タスク数で按分して、完了数から earned を算出します。

日割り: dailyIncome = annualIncome / daysPerYear

1タスク報酬: perTaskReward = dailyIncome / taskCount（taskCount=0 のとき 0）

目標の獲得額（表示用）: earnedAmount = perTaskReward * completedTaskCount

タスク完了時に CurrencyEvent.usd(..., perTaskReward) を保存（監査/集計用）

2. 実現していること

ユーザー登録 / ログイン（JWT発行）

Goal 作成・一覧・取得・達成（/api/goals）

Goal 配下の Task 追加（/api/goals/{id}/tasks）

Task 完了（/api/tasks/{taskId}/complete）

所有権チェック（他人のタスクを完了できない）

完了時に CurrencyEvent を保存

サマリー取得（/api/me/summary）※存在している前提（あなたの grep 結果にあり）

3. 技術スタック

Java 21

Spring Boot 4.x

Spring Web

Spring Security（JWT / Stateless）

Spring Data JPA（Hibernate）

PostgreSQL

Flyway（DBマイグレーション）

Gradle

4. アーキテクチャ
コンポーネント図
flowchart LR
  Client[Web / iOS / CLI(curl)] -->|HTTP JSON + Bearer JWT| API[Controllers (/api/*)]
  API --> SEC[Spring Security FilterChain]
  SEC --> JWT[JwtAuthFilter + JwtService]
  API --> REPO[Repositories (JPA)]
  REPO --> DB[(PostgreSQL)]
  API --> FLYWAY[Flyway]
  FLYWAY --> DB

リクエスト処理フロー（重要ポイント）

Authorization: Bearer <token> を受け取る

JwtAuthFilter が JWT を検証し SecurityContext に AppPrincipal(userId, email, ...) をセット

Controller は @AuthenticationPrincipal AppPrincipal から userId を取得

DBから user をロードし、所有権チェック（自分の Goal / Task のみ操作可）

目標/タスクの更新＋必要なら CurrencyEvent を保存

5. データモデル
ERD（概念）
erDiagram
  USERS ||--o{ GOALS : owns
  GOALS ||--o{ TASKS : has
  USERS ||--o{ CURRENCY_EVENTS : logs
  GOALS ||--o{ CURRENCY_EVENTS : relates
  TASKS ||--o{ CURRENCY_EVENTS : relates

  USERS {
    bigint id PK
    varchar email "unique"
    varchar password_hash
    timestamptz created_at
  }

  GOALS {
    bigint id PK
    bigint user_id FK
    varchar title
    double annual_income
    int days_per_year
    boolean achieved
    timestamptz created_at
  }

  TASKS {
    bigint id PK
    bigint goal_id FK
    varchar title
    boolean completed
    timestamptz completed_at
    timestamptz created_at
  }

  CURRENCY_EVENTS {
    bigint id PK
    bigint user_id FK
    bigint goal_id FK
    bigint task_id FK
    varchar currency
    double amount
    timestamptz created_at
  }

実装上のポイント

JPA Entity は com.example.todomoney.entity.* に統一（User/Goal/Task/CurrencyEvent）

完了時のイベント作成は CurrencyEvent.usd(user, goal, task, amount) に集約

6. 認証・認可
方針

セッションなし（STATELESS）

/api/auth/** は公開、それ以外は JWT 必須

userId をリクエストパラメータで受け取らない（なりすまし防止）

userId は JWT → AppPrincipal から取得

認証フロー（シーケンス）
sequenceDiagram
  participant C as Client
  participant A as /api/auth/login
  participant S as JwtService
  participant F as JwtAuthFilter
  participant G as /api/goals
  participant DB as Repositories/DB

  C->>A: POST email/password
  A->>DB: findByEmail + password check
  A->>S: issueToken(userId,email)
  S-->>A: JWT
  A-->>C: { token }

  C->>G: GET /api/goals (Authorization: Bearer JWT)
  G->>F: (Filter) validate JWT
  F-->>G: set SecurityContext(AppPrincipal)
  G->>DB: findByUserOrderByIdDesc(userId)
  DB-->>G: goals
  G-->>C: goals JSON

7. API 仕様
Auth（公開）

POST /api/auth/register

POST /api/auth/login

Goals（🔒 JWT 必須）

POST /api/goals
body: { "title": "...", "annualIncome": 600000 }

GET /api/goals

GET /api/goals/{id}

POST /api/goals/{id}/tasks
body: { "title": "..." }

POST /api/goals/{id}/achieve

Tasks（🔒 JWT 必須）

POST /api/tasks/{taskId}/complete
response: { "rewardAmount": 12.34, "currency": "USD" }

Me（🔒 JWT 必須）

GET /api/me/summary
※返却 JSON はあなたの MeController 実装に依存（存在は確認済み）

8. ローカル起動手順
前提

Java 21

PostgreSQL がローカルで起動していること

DB 名例: todo_money

DB 作成（例）
createdb todo_money
# または psql で CREATE DATABASE todo_money;

設定（例：application.properties）
spring.datasource.url=jdbc:postgresql://localhost:5432/todo_money
spring.datasource.username=YOUR_DB_USER
spring.datasource.password=YOUR_DB_PASS

# Flyway を正とするなら validate 推奨（最終的に update は外す）
# spring.jpa.hibernate.ddl-auto=validate

起動
./gradlew clean bootRun


起動ログで Tomcat started on port 8080 が出れば OK。

9. 動作デモ（curl 一連）
1) Register
curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass1234"}'

2) Login → TOKEN 取得
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass1234"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

echo "$TOKEN"

3) Goal 作成
curl -s -X POST http://localhost:8080/api/goals \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"副業で月5万","annualIncome":600000}'

4) Goal 一覧（GoalListItem が返る）
curl -s http://localhost:8080/api/goals \
  -H "Authorization: Bearer $TOKEN"

5) Task 追加（GoalId を指定）

GOAL_ID は一覧から拾う

GOAL_ID=1

curl -s -X POST http://localhost:8080/api/goals/$GOAL_ID/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"案件応募を1社やる"}'


返ってきた Task JSON から id（taskId）を控える。

6) Task 完了 → 報酬付与（CurrencyEvent が保存される）
TASK_ID=1

curl -s -X POST http://localhost:8080/api/tasks/$TASK_ID/complete \
  -H "Authorization: Bearer $TOKEN"

7) もう一度 Goal 一覧 → earnedAmount が増える
curl -s http://localhost:8080/api/goals \
  -H "Authorization: Bearer $TOKEN"

8) サマリー（/api/me/summary）
curl -s http://localhost:8080/api/me/summary \
  -H "Authorization: Bearer $TOKEN"

10. 今回ぶち当たった壁とキーポイント
(A) Task が見つからない（コンパイルエラー）

原因：import / package の混在、またはクラスの配置揺れ

解決：Entity を com.example.todomoney.entity に統一し、Controller/Repository は必ず entity を参照

(B) entity.User と domain.User の混在

原因：途中で domain パッケージと entity パッケージが混ざった

解決：DB永続化対象は entity に統一（Repository が扱う型は entity）

(C) ConflictingBeanDefinitionException（AuthController が2つ）

原因：web.AuthController と controller.AuthController が同時に ComponentScan され Bean 名衝突

解決：旧コードを _bak に退避 or 削除（Controller が1つだけになるように整理）

(D) 403 が出る（JWT を付けてるつもり）

原因：Authorization: Bearer TOKEN の TOKEN が置換されていないケースが多い

解決：shell で TOKEN 変数を作り Bearer $TOKEN を確実に送る（あなたはここを直して 200 を確認済み）

(E) /actuator/health が 404 / 403

404：Actuator 依存が未導入、または endpoint 未expose

403：Security 側で保護されている

本プロジェクトの必須要件ではない（APIが動けばOK）

もし必要なら：spring-boot-starter-actuator を追加し、/actuator/health を permitAll する

11. ディレクトリ構成
src/main/java/com/example/todomoney/
  entity/
    User.java
    Goal.java
    Task.java
    CurrencyEvent.java
  repo/
    UserRepository.java
    GoalRepository.java
    TaskRepository.java
    CurrencyEventRepository.java
  security/
    SecurityConfig.java
    JwtAuthFilter.java
    JwtService.java
    AppPrincipal.java
  web/
    AuthController.java
    GoalController.java
    TaskController.java
    MeController.java

src/main/resources/
  application.properties (or yml)
  db/migration/ (Flyway SQL)

12. 今後の拡張案（転職で刺さる伸ばし方）

OpenAPI（Swagger）導入 → API を可視化（面接で強い）

CurrencyEvent 集計（期間別、Goal別、日別）を拡充

目標達成ロジック（achieve の自動化、達成時ボーナス）

Refresh Token / Rotation（セキュリティ強化）

レート制限、監査ログ、エラーレスポンス統一（ApiError）

補足（超重要）

あなたが貼ってくれた MeController のコードは com.example.demo... で別プロジェクトの内容が混ざっています。
いま動いているのは com.example.todomoney.web.MeController（grep に出てる /api/me/summary）の方なので、README もそれに合わせました。