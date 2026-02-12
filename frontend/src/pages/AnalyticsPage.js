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
    const [boardProgressData, setBoardProgressData] = useState([]);
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
                    let perBoardProgress = [];
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
                            let boardCards = 0;
                            let boardDone = 0;
                            board.lists.forEach(list => {
                                if (list.cards) {
                                    totalCards += list.cards.length;
                                    boardCards += list.cards.length;
                                    // Count cards in "Done" or "Completed" lists as completed
                                    if (list.title.toLowerCase().includes('done') ||
                                        list.title.toLowerCase().includes('complete')) {
                                        completedCards += list.cards.length;
                                        boardDone += list.cards.length;
                                    }
                                }
                            });
                            // Store per-board progress
                            const progress = boardCards > 0 ? Math.round((boardDone / boardCards) * 100) : 0;
                            perBoardProgress.push({
                                id: board.id || board.ID,
                                name: board.title,
                                progress,
                            });
                        }
                    });

                    const averageProgress = totalCards > 0
                        ? Math.round((completedCards / totalCards) * 100)
                        : 0;

                    setBoardProgressData(perBoardProgress);
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

    // Board progress data from real computed values
    const boardProgress = boardProgressData.slice(0, 5).map((board, idx) => ({
        ...board,
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
                                    <div className="analytics-coming-soon">
                                        <ClockIcon size={32} />
                                        <p>Activity tracking coming soon</p>
                                        <span>We're working on capturing your daily task completions to show trends here.</span>
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
