package com.example.todomoney.web;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.todomoney.security.AppPrincipal;
import com.example.todomoney.service.TaskService;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

  private final TaskService taskService;

  public TaskController(TaskService taskService) {
    this.taskService = taskService;
  }

  @PostMapping
  public TaskService.CreateTaskResponse create(
      @AuthenticationPrincipal AppPrincipal p,
      @RequestBody TaskService.CreateTaskRequest req
  ) {
    if (p == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "unauthorized");
    return taskService.createTask(p.userId(), req);
  }

  @PostMapping("/{taskId}/complete")
  public TaskService.CompleteTaskResponse complete(
      @AuthenticationPrincipal AppPrincipal p,
      @PathVariable long taskId
  ) {
    if (p == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "unauthorized");
    return taskService.completeTask(p.userId(), taskId);
  }

  @PostMapping("/{taskId}/archive")
  public void archive(
      @AuthenticationPrincipal AppPrincipal p,
      @PathVariable long taskId,
      @RequestParam boolean archived
  ) {
    if (p == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "unauthorized");
    taskService.setArchived(p.userId(), taskId, archived);
  }
}
