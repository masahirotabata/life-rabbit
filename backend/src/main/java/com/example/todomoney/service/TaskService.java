package com.example.todomoney.service;

import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.todomoney.entity.CurrencyEvent;
import com.example.todomoney.entity.Goal;
import com.example.todomoney.entity.Task;
import com.example.todomoney.repo.CurrencyEventRepository;
import com.example.todomoney.repo.GoalRepository;
import com.example.todomoney.repo.TaskRepository;
import com.example.todomoney.repo.UserRepository;

@Service
public class TaskService {

  private final TaskRepository taskRepo;
  private final GoalRepository goalRepo;
  private final UserRepository userRepo;
  private final CurrencyEventRepository eventRepo;

  public TaskService(
      TaskRepository taskRepo,
      GoalRepository goalRepo,
      UserRepository userRepo,
      CurrencyEventRepository eventRepo
  ) {
    this.taskRepo = taskRepo;
    this.goalRepo = goalRepo;
    this.userRepo = userRepo;
    this.eventRepo = eventRepo;
  }

  // ===== DTO =====
  public record CreateTaskRequest(Long goalId, String title, String memo) {}
  public record CreateTaskResponse(Long id) {}
  public record CompleteTaskResponse(double rewardAmount, String currency) {}

  /**
   * ✅ タスク作成
   * Task は Long userId で所有者を持つので setUserId が必須
   */
  @Transactional
  public CreateTaskResponse createTask(long userId, CreateTaskRequest req) {
    if (req == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "request is required");
    }
    if (req.goalId() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "goalId is required");
    }
    if (req.title() == null || req.title().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title is required");
    }

    var goal = goalRepo.findById(req.goalId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "goal not found"));

    // goal が本人のものかチェック（Goal は ManyToOne<User> を持っている想定）
    var goalOwnerId = (goal.getUser() != null) ? goal.getUser().getId() : null;
    if (goalOwnerId == null || goalOwnerId.longValue() != userId) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "not your goal");
    }

    var now = Instant.now();

    var task = new Task();
    task.setUserId(userId);        // ★ これが無いと tasks.user_id が NULL になる
    task.setGoal(goal);
    task.setTitle(req.title());
    task.setMemo(req.memo());

    task.setCompleted(false);
    task.setArchived(false);

    // createdAt は Task 側のフィールド初期値 / @PrePersist に任せる
    task.setUpdatedAt(now);

    var saved = taskRepo.save(task);
    return new CreateTaskResponse(saved.getId());
  }

  /**
   * ✅ タスク完了
   * 所有者チェックは tasks.user_id で行う
   */
  @Transactional
  public CompleteTaskResponse completeTask(long userId, long taskId) {
    var user = userRepo.findById(userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "user not found"));

    var task = taskRepo.findById(taskId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "task not found"));

    if (task.getUserId() == null || task.getUserId().longValue() != userId) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "not your task");
    }
    if (task.getGoal() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "this task has no goal");
    }
    if (task.isCompleted()) {
      // すでに完了済みなら新しい報酬は発生させない
      return new CompleteTaskResponse(0, "USD");
    }

    Goal goal = task.getGoal();
    long taskCount = taskRepo.countByGoal(goal);

    double dailyIncome = goal.getAnnualIncome() / goal.getDaysPerYear();
    double perTaskReward = (taskCount == 0) ? 0 : dailyIncome / taskCount;

    task.setCompleted(true);
    task.setUpdatedAt(Instant.now());
    taskRepo.save(task);

    // USD でイベントを記録（将来マルチ通貨に拡張する入口）
    eventRepo.save(CurrencyEvent.usd(user, goal, task, perTaskReward));

    return new CompleteTaskResponse(perTaskReward, "USD");
  }

  /**
   * アーカイブフラグの更新
   */
  @Transactional
  public void setArchived(long userId, long taskId, boolean archived) {
    var task = taskRepo.findById(taskId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "task not found"));

    if (task.getUserId() == null || task.getUserId().longValue() != userId) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "not your task");
    }

    task.setArchived(archived);
    task.setUpdatedAt(Instant.now());
    taskRepo.save(task);
  }
}
