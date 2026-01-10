import React, { useState, useEffect } from 'react';
import { PageHeader, PageContent } from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressCircle } from '../components/ui/ProgressCircle';
import { BoardIcon, ListIcon, CheckCircleIcon, TargetIcon, RocketIcon, LightbulbIcon, ClockIcon } from '../components/ui/Icons';
import { api } from '../services/api';
import './AnalyticsPage.css';

/**
 * Analytics Page - Board and productivity statistics
 */
function AnalyticsPage({ authToken }) {
    const [boards, setBoards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalBoards: 0,
        totalLists: 0,
        totalCards: 0,
        completedCards: 0,
        averageProgress: 0,
    });

    useEffect(() => {
        if (!authToken) return;

        let cancelled = false;
        setLoading(true);

        (async () => {
            try {
                const data = await api.getBoards(authToken);
                if (!cancelled) {
                    setBoards(data || []);

                    // Calculate stats
                    let totalLists = 0;
                    let totalCards = 0;
                    let completedCards = 0;

                    // Fetch details for each board to get lists/cards
                    const boardDetails = await Promise.all(
                        (data || []).map(board =>
                            api.getBoard(board.id, authToken).catch(() => null)
                        )
                    );

                    boardDetails.forEach(board => {
                        if (board && board.lists) {
                            totalLists += board.lists.length;
                            board.lists.forEach(list => {
                                if (list.cards) {
                                    totalCards += list.cards.length;
                                    // Count cards in "Done" or "Completed" lists as completed
                                    if (list.title.toLowerCase().includes('done') ||
                                        list.title.toLowerCase().includes('complete')) {
                                        completedCards += list.cards.length;
                                    }
                                }
                            });
                        }
                    });

                    const averageProgress = totalCards > 0
                        ? Math.round((completedCards / totalCards) * 100)
                        : 0;

                    setStats({
                        totalBoards: data?.length || 0,
                        totalLists,
                        totalCards,
                        completedCards,
                        averageProgress,
                    });
                }
            } catch (e) {
                console.error('Failed to load analytics:', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [authToken]);

    // Simulated activity data for the chart
    const activityData = [
        { day: 'Mon', tasks: 12 },
        { day: 'Tue', tasks: 19 },
        { day: 'Wed', tasks: 8 },
        { day: 'Thu', tasks: 15 },
        { day: 'Fri', tasks: 22 },
        { day: 'Sat', tasks: 6 },
        { day: 'Sun', tasks: 4 },
    ];

    const maxActivity = Math.max(...activityData.map(d => d.tasks));

    // Board progress data
    const boardProgress = boards.slice(0, 5).map((board, idx) => ({
        id: board.id,
        name: board.title,
        progress: Math.floor(Math.random() * 100), // Simulated
        color: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'][idx % 5],
    }));

    if (!authToken) {
        return (
            <>
                <PageHeader
                    title="Analytics"
                    description="Please log in to view your analytics."
                    kicker="Insights"
                />
                <PageContent>
                    <div className="analytics-empty-state">
                        <p>Log in to see your productivity insights.</p>
                    </div>
                </PageContent>
            </>
        );
    }

    return (
        <>
            <PageHeader
                title="Analytics"
                description="Track your productivity and project progress at a glance."
                kicker="Insights"
            />
            <PageContent>
                {loading ? (
                    <div className="analytics-loading">
                        <div className="app-loading__spinner" />
                        <p>Loading analytics...</p>
                    </div>
                ) : (
                    <>
                        {/* Stats Cards */}
                        <section className="analytics-stats">
                            <Card className="stat-card stat-card--primary">
                                <CardContent>
                                    <div className="stat-card__icon">
                                        <BoardIcon size={28} />
                                    </div>
                                    <div className="stat-card__content">
                                        <span className="stat-card__value">{stats.totalBoards}</span>
                                        <span className="stat-card__label">Total Boards</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="stat-card stat-card--accent">
                                <CardContent>
                                    <div className="stat-card__icon">
                                        <ListIcon size={28} />
                                    </div>
                                    <div className="stat-card__content">
                                        <span className="stat-card__value">{stats.totalLists}</span>
                                        <span className="stat-card__label">Total Lists</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="stat-card stat-card--success">
                                <CardContent>
                                    <div className="stat-card__icon">
                                        <CheckCircleIcon size={28} />
                                    </div>
                                    <div className="stat-card__content">
                                        <span className="stat-card__value">{stats.totalCards}</span>
                                        <span className="stat-card__label">Total Cards</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="stat-card stat-card--warning">
                                <CardContent>
                                    <div className="stat-card__icon">
                                        <TargetIcon size={28} />
                                    </div>
                                    <div className="stat-card__content">
                                        <span className="stat-card__value">{stats.averageProgress}%</span>
                                        <span className="stat-card__label">Completion Rate</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>

                        {/* Charts Section */}
                        <section className="analytics-charts">
                            {/* Activity Chart */}
                            <Card className="analytics-chart-card">
                                <CardHeader>
                                    <CardTitle>Weekly Activity</CardTitle>
                                    <CardDescription>Tasks completed per day this week</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="activity-chart">
                                        {activityData.map((data) => (
                                            <div key={data.day} className="activity-bar-container">
                                                <div className="activity-bar-wrapper">
                                                    <div
                                                        className="activity-bar"
                                                        style={{
                                                            height: `${Math.max((data.tasks / maxActivity) * 100, 15)}%`,
                                                        }}
                                                    >
                                                        <span className="activity-bar__value">{data.tasks}</span>
                                                    </div>
                                                </div>
                                                <span className="activity-bar__label">{data.day}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Board Progress */}
                            <Card className="analytics-chart-card">
                                <CardHeader>
                                    <CardTitle>Board Progress</CardTitle>
                                    <CardDescription>Progress across your active boards</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {boardProgress.length === 0 ? (
                                        <div className="analytics-empty-mini">
                                            <p>No boards yet. Create one to track progress!</p>
                                        </div>
                                    ) : (
                                        <div className="board-progress-list">
                                            {boardProgress.map((board) => (
                                                <div key={board.id} className="board-progress-item">
                                                    <ProgressCircle
                                                        progress={board.progress}
                                                        size={40}
                                                        strokeWidth={4}
                                                        color={board.color}
                                                    />
                                                    <div className="board-progress-item__info">
                                                        <span className="board-progress-item__name">{board.name}</span>
                                                        <div className="board-progress-item__bar">
                                                            <div
                                                                className="board-progress-item__fill"
                                                                style={{
                                                                    width: `${board.progress}%`,
                                                                    backgroundColor: board.color,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <Badge variant="secondary">{board.progress}%</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </section>

                        {/* Recent Activity */}
                        <section className="analytics-recent">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Productivity Insights</CardTitle>
                                    <CardDescription>Tips based on your activity</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="insights-list">
                                        <div className="insight-item insight-item--success">
                                            <span className="insight-item__icon">
                                                <RocketIcon size={24} />
                                            </span>
                                            <div className="insight-item__content">
                                                <strong>Great momentum!</strong>
                                                <p>You've completed {stats.completedCards} tasks. Keep it up!</p>
                                            </div>
                                        </div>
                                        <div className="insight-item insight-item--info">
                                            <span className="insight-item__icon">
                                                <LightbulbIcon size={24} />
                                            </span>
                                            <div className="insight-item__content">
                                                <strong>Pro tip</strong>
                                                <p>Break down large cards into smaller, actionable tasks for better tracking.</p>
                                            </div>
                                        </div>
                                        <div className="insight-item insight-item--warning">
                                            <span className="insight-item__icon">
                                                <ClockIcon size={24} />
                                            </span>
                                            <div className="insight-item__content">
                                                <strong>Stay on track</strong>
                                                <p>Review your boards weekly to ensure nothing falls through the cracks.</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>
                    </>
                )}
            </PageContent>
        </>
    );
}

export default AnalyticsPage;
