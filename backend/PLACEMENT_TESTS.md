# Placement tests

Levels can optionally require an entrance test. A level with its test disabled
is open. Passing a test unlocks that level and every lower level; an existing
pass for a higher level also unlocks lower levels that require a test.

Admins need a user whose `role` is `ADMIN`. Newly registered users default to
`USER`.

## Configure a level

Create a level with an optional test:

```http
POST /levels
```

```json
{
  "name": "A2",
  "description": "Elementary",
  "display_order": 2,
  "placement_test_enabled": true,
  "placement_test_question_count": 20,
  "placement_test_passing_score": 15
}
```

Or update an existing level:

```http
PATCH /admin/levels/{level_id}/placement-test
```

```json
{
  "enabled": true,
  "question_count": 20,
  "passing_score": 15
}
```

Use `enabled: false` to make the level open without an entrance test. The
passing score must be at least one and cannot exceed the configured question
count.

## User flow

1. `GET /levels` returns each active level and the caller's `is_unlocked` state.
2. `GET /levels/{level_id}/access` returns access and test configuration.
3. If a test is enabled, start one with
   `POST /levels/{level_id}/placement-test/attempts`.
4. Fetch the randomized multiple-choice questions from
   `GET /placement-test/attempts/{attempt_id}/questions`.
5. Submit each selected Vietnamese meaning to
   `POST /placement-test/attempts/{attempt_id}/questions/{item_id}/answer`:

   ```json
   { "answer": "mẹ" }
   ```

6. Finish with `POST /placement-test/attempts/{attempt_id}/complete`. The
   response contains the score, effective passing score, and pass status.
7. Fetch content from `/levels/{level_id}/topics`,
   `/topics/{topic_id}/lessons`, or `/lessons/{lesson_id}/words`. Locked levels
   return HTTP 403.

Questions sample distinct vocabulary assigned to active lessons in that level.
Each question has four distinct meanings sampled from that same level, and the
answer is graded by the backend. The test contains at most the configured
question count and never more questions than available words. If fewer words
are available than requested, the attempt's passing score is capped to its
actual question count so the test remains passable.

Existing SQLite databases are migrated additively when `app.main` starts. The
migration preserves existing users and curriculum data; back up the database
before deployment as usual.
