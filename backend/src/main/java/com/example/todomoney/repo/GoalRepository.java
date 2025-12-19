package com.example.todomoney.repo;

import com.example.todomoney.entity.Goal;
import com.example.todomoney.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface GoalRepository extends JpaRepository<Goal, Long> {
  List<Goal> findByUserOrderByIdDesc(User user);
  Optional<Goal> findByIdAndUser(Long id, User user);
}
