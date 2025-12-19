package com.example.todomoney.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "currency_events")
public class CurrencyEvent {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name="user_id")
  private User user;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name="goal_id")
  private Goal goal;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name="task_id")
  private Task task;

  @Column(nullable = false)
  private String currency = "USD";

  @Column(nullable = false)
  private double amount;

  @Column(name="created_at", nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  public static CurrencyEvent usd(User user, Goal goal, Task task, double amount) {
    CurrencyEvent e = new CurrencyEvent();
    e.user = user;
    e.goal = goal;
    e.task = task;
    e.currency = "USD";
    e.amount = amount;
    return e;
  }

  public Long getId() { return id; }
  public double getAmount() { return amount; }
  public String getCurrency() { return currency; }
}
