package com.example.todomoney.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.todomoney.entity.Goal;
import com.example.todomoney.entity.Task;
import com.example.todomoney.entity.User;
import com.example.todomoney.repo.GoalRepository;
import com.example.todomoney.repo.TaskRepository;
import com.example.todomoney.repo.UserRepository;
import com.example.todomoney.security.AppPrincipal;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@RestController
@RequestMapping("/api/goals")
public class GoalController {

  private final GoalRepository goalRepo;
  private final TaskRepository taskRepo;
  private final UserRepository userRepo;

  public GoalController(GoalRepository goalRepo, TaskRepository taskRepo, UserRepository userRepo) {
    this.goalRepo = goalRepo;
    this.taskRepo = taskRepo;
    this.userRepo = userRepo;
  }

  public record CreateGoalRequest(@NotBlank String title, @NotNull @Min(1) Double annualIncome) {}
  public record AddTaskRequest(@NotBlank String title) {}

  public record GoalListItem(
      long id, String title, double annualIncome, int daysPerYear, boolean achieved,
      long taskCount, long completedTaskCount, double perTaskReward, double earnedAmount
  ) {}

  // ★ Entityを返さない：Task用DTO
  public record TaskItem(long id, long goalId, String title, boolean completed) {}

  // GET /api/goals/{id}/tasks
  @GetMapping("/{id}/tasks")
  public List<TaskItem> tasks(@AuthenticationPrincipal AppPrincipal p, @PathVariable long id) {
    User user = userRepo.findById(p.userId()).orElseThrow();
    Goal g = goalRepo.findByIdAndUser(id, user)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "goal not found"));

    return taskRepo.findByGoalOrderByIdDesc(g).stream()
    	    .map(t -> new TaskItem(t.getId(), g.getId(), t.getTitle(), t.isCompleted()))
    	    .toList();
  }


  // POST /api/goals/{id}/tasks
  @PostMapping("/{id}/tasks")
  public TaskItem addTask(@AuthenticationPrincipal AppPrincipal p, @PathVariable long id, @Valid @RequestBody AddTaskRequest req) {
    User user = userRepo.findById(p.userId()).orElseThrow();
    Goal g = goalRepo.findByIdAndUser(id, user)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "goal not found"));

    Task t = new Task();
    t.setGoal(g);
    t.setTitle(req.title());
    t = taskRepo.save(t);

    return new TaskItem(t.getId(), g.getId(), t.getTitle(), t.isCompleted());
  }

  @PostMapping
  public GoalListItem create(@AuthenticationPrincipal AppPrincipal p, @Valid @RequestBody CreateGoalRequest req) {
    User user = userRepo.findById(p.userId()).orElseThrow();
    Goal g = new Goal();
    g.setUser(user);
    g.setTitle(req.title());
    g.setAnnualIncome(req.annualIncome());
    g.setDaysPerYear(365);
    g = goalRepo.save(g);
    return toItem(g);
  }

  @GetMapping
  public List<GoalListItem> list(@AuthenticationPrincipal AppPrincipal p) {
    User user = userRepo.findById(p.userId()).orElseThrow();
    return goalRepo.findByUserOrderByIdDesc(user).stream().map(this::toItem).toList();
  }

  @GetMapping("/{id}")
  public GoalListItem get(@AuthenticationPrincipal AppPrincipal p, @PathVariable long id) {
    User user = userRepo.findById(p.userId()).orElseThrow();
    Goal g = goalRepo.findByIdAndUser(id, user)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "goal not found"));
    return toItem(g);
  }

  @PostMapping("/{id}/achieve")
  public GoalListItem achieve(@AuthenticationPrincipal AppPrincipal p, @PathVariable long id) {
    User user = userRepo.findById(p.userId()).orElseThrow();
    Goal g = goalRepo.findByIdAndUser(id, user)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "goal not found"));
    g.setAchieved(true);
    g = goalRepo.save(g);
    return toItem(g);
  }

  private GoalListItem toItem(Goal g) {
    long taskCount = taskRepo.countByGoal(g);
    long doneCount = taskRepo.countByGoalAndCompletedTrue(g);

    double dailyIncome = g.getAnnualIncome() / g.getDaysPerYear();
    double perTaskReward = (taskCount == 0) ? 0 : dailyIncome / taskCount;
    double earned = perTaskReward * doneCount;

    return new GoalListItem(
        g.getId(), g.getTitle(), g.getAnnualIncome(), g.getDaysPerYear(), g.isAchieved(),
        taskCount, doneCount, perTaskReward, earned
    );
  }
}
