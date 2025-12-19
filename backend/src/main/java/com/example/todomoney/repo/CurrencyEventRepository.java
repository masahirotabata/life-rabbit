package com.example.todomoney.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.example.todomoney.entity.CurrencyEvent;
import com.example.todomoney.entity.User;

public interface CurrencyEventRepository extends JpaRepository<CurrencyEvent, Long> {
  @Query("select coalesce(sum(e.amount),0) from CurrencyEvent e where e.user = :user and e.goal.achieved = false")
  double sumPotential(User user);

  @Query("select coalesce(sum(e.amount),0) from CurrencyEvent e where e.user = :user and e.goal.achieved = true")
  double sumAchieved(User user);

  @Query("select count(e) from CurrencyEvent e where e.user = :user")
  long countAll(User user);
}
