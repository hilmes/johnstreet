"""
Backtesting Web UI - Clean and intuitive interface for strategy testing

Run with: python backtest_ui.py
Then open http://localhost:8050 in your browser
"""

import dash
from dash import dcc, html, Input, Output, State, dash_table
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
from typing import Dict, List
import asyncio

from backtesting_engine import BacktestingEngine, BacktestResult
from historical_data_manager import HistoricalDataManager
from strategies.momentum_strategy import MomentumStrategy
from strategies.mean_reversion_strategy import MeanReversionStrategy
from strategies.grid_trading_strategy import GridTradingStrategy

# Initialize Dash app
app = dash.Dash(__name__, title="Trading Strategy Backtester")

# Custom CSS styling
app.index_string = '''
<!DOCTYPE html>
<html>
    <head>
        {%metas%}
        <title>{%title%}</title>
        {%favicon%}
        {%css%}
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f5f5f7;
            }
            .main-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 2rem;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .container {
                max-width: 1400px;
                margin: 0 auto;
                padding: 2rem;
            }
            .card {
                background: white;
                border-radius: 12px;
                padding: 1.5rem;
                margin-bottom: 2rem;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            }
            .metric-card {
                text-align: center;
                padding: 1rem;
                border-radius: 8px;
                background: #f8f9fa;
                margin: 0.5rem;
            }
            .metric-value {
                font-size: 2rem;
                font-weight: bold;
                margin: 0.5rem 0;
            }
            .metric-label {
                color: #666;
                font-size: 0.9rem;
            }
            .positive { color: #10b981; }
            .negative { color: #ef4444; }
            .run-button {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 1rem 2rem;
                border-radius: 8px;
                font-size: 1.1rem;
                cursor: pointer;
                transition: transform 0.2s;
            }
            .run-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
        </style>
    </head>
    <body>
        {%app_entry%}
        <footer>
            {%config%}
            {%scripts%}
            {%renderer%}
        </footer>
    </body>
</html>
'''

# Available strategies
STRATEGIES = {
    'Momentum': MomentumStrategy,
    'Mean Reversion': MeanReversionStrategy,
    'Grid Trading': GridTradingStrategy,
}

# Layout
app.layout = html.Div([
    # Header
    html.Div([
        html.H1("🚀 Trading Strategy Backtester", style={'margin': 0}),
        html.P("Test your strategies with historical data before risking real money", 
               style={'margin': '0.5rem 0 0 0', 'opacity': 0.9})
    ], className='main-header'),
    
    # Main container
    html.Div([
        # Configuration Card
        html.Div([
            html.H2("⚙️ Backtest Configuration"),
            
            html.Div([
                html.Div([
                    html.Label("Strategy"),
                    dcc.Dropdown(
                        id='strategy-dropdown',
                        options=[{'label': k, 'value': k} for k in STRATEGIES.keys()],
                        value='Momentum',
                        style={'marginBottom': '1rem'}
                    ),
                ], style={'flex': 1, 'marginRight': '1rem'}),
                
                html.Div([
                    html.Label("Data Source"),
                    dcc.Dropdown(
                        id='data-source-dropdown',
                        options=[
                            {'label': '📊 Real Historical Data', 'value': 'real'},
                            {'label': '🎲 Simulated Data', 'value': 'simulated'}
                        ],
                        value='real',
                        style={'marginBottom': '1rem'}
                    ),
                ], style={'flex': 1, 'marginRight': '1rem'}),
                
                html.Div([
                    html.Label("Trading Pairs"),
                    dcc.Dropdown(
                        id='pairs-dropdown',
                        options=[
                            {'label': 'BTC/USD', 'value': 'XBTUSD'},
                            {'label': 'ETH/USD', 'value': 'ETHUSD'},
                            {'label': 'XRP/USD', 'value': 'XRPUSD'},
                            {'label': 'ADA/USD', 'value': 'ADAUSD'},
                            {'label': 'SOL/USD', 'value': 'SOLUSD'},
                            {'label': 'DOT/USD', 'value': 'DOTUSD'},
                        ],
                        value=['XBTUSD'],
                        multi=True,
                        style={'marginBottom': '1rem'}
                    ),
                ], style={'flex': 1, 'marginRight': '1rem'}),
                
                html.Div([
                    html.Label("Initial Capital ($)"),
                    dcc.Input(
                        id='capital-input',
                        type='number',
                        value=10000,
                        min=1000,
                        step=1000,
                        style={'width': '100%', 'padding': '0.5rem', 'borderRadius': '4px', 'border': '1px solid #ddd'}
                    ),
                ], style={'flex': 1}),
            ], style={'display': 'flex', 'marginBottom': '1rem'}),
            
            html.Div([
                html.Div([
                    html.Label("Start Date"),
                    dcc.DatePickerSingle(
                        id='start-date',
                        date=datetime.now() - timedelta(days=30),  # Shorter default period
                        display_format='YYYY-MM-DD',
                        style={'marginBottom': '1rem'}
                    ),
                ], style={'flex': 1, 'marginRight': '1rem'}),
                
                html.Div([
                    html.Label("Timeframe"),
                    dcc.Dropdown(
                        id='timeframe-dropdown',
                        options=[
                            {'label': '1 Minute', 'value': '1m'},
                            {'label': '5 Minutes', 'value': '5m'},
                            {'label': '15 Minutes', 'value': '15m'},
                            {'label': '1 Hour', 'value': '1h'},
                            {'label': '1 Day', 'value': '1d'}
                        ],
                        value='5m',
                        style={'marginBottom': '1rem'}
                    ),
                ], style={'flex': 1, 'marginRight': '1rem'}),
                
                html.Div([
                    html.Label("End Date"),
                    dcc.DatePickerSingle(
                        id='end-date',
                        date=datetime.now(),
                        display_format='YYYY-MM-DD',
                        style={'marginBottom': '1rem'}
                    ),
                ], style={'flex': 1, 'marginRight': '1rem'}),
                
                html.Div([
                    html.Button("🚀 Run Backtest", id='run-backtest', className='run-button',
                              style={'marginTop': '1.5rem', 'width': '100%'}),
                ], style={'flex': 1}),
            ], style={'display': 'flex', 'alignItems': 'flex-end'}),
            
        ], className='card'),
        
        # Loading indicator
        dcc.Loading(
            id="loading",
            type="default",
            children=[
                # Results section
                html.Div(id='backtest-results', style={'marginTop': '2rem'})
            ]
        ),
        
        # Hidden div to store results
        html.Div(id='results-store', style={'display': 'none'}),
        
        # Data status indicator
        html.Div(id='data-status', style={'margin': '1rem 0'})
        
    ], className='container')
])


@app.callback(
    Output('backtest-results', 'children'),
    Output('results-store', 'children'),
    Output('data-status', 'children'),
    Input('run-backtest', 'n_clicks'),
    State('strategy-dropdown', 'value'),
    State('data-source-dropdown', 'value'),
    State('pairs-dropdown', 'value'),
    State('capital-input', 'value'),
    State('start-date', 'date'),
    State('end-date', 'date'),
    State('timeframe-dropdown', 'value'),
    prevent_initial_call=True
)
def run_backtest(n_clicks, strategy_name, data_source, pairs, initial_capital, start_date, end_date, timeframe):
    """Run backtest and display results"""
    
    if not all([strategy_name, pairs, initial_capital, start_date, end_date]):
        return html.Div("Please fill in all fields"), "", ""
    
    # Convert dates
    start = pd.to_datetime(start_date)
    end = pd.to_datetime(end_date)
    
    # Validate date range
    if (end - start).days > 90:
        warning_msg = html.Div([
            html.Span("⚠️ ", style={'color': '#f39c12'}),
            "Date range > 90 days may take longer to load real data"
        ], style={'color': '#f39c12', 'fontWeight': 'bold'})
        
    else:
        warning_msg = ""
    
    # Setup data manager for real data
    data_manager = None
    use_real_data = (data_source == 'real')
    
    if use_real_data:
        # Initialize data manager with environment variables
        import os
        data_manager = HistoricalDataManager(
            kraken_api_key=os.getenv('KRAKEN_API_KEY'),
            kraken_api_secret=os.getenv('KRAKEN_API_SECRET'),
            cryptocompare_api_key=os.getenv('CRYPTOCOMPARE_API_KEY')
        )
    
    # Create backtest engine
    engine = BacktestingEngine(
        initial_capital=initial_capital,
        data_manager=data_manager,
        use_real_data=use_real_data
    )
    
    strategy_class = STRATEGIES[strategy_name]
    
    # Status message
    data_status = html.Div([
        html.Span("📊 " if use_real_data else "🎲 "),
        f"Running backtest with {'real historical' if use_real_data else 'simulated'} data...",
        html.Br(),
        f"Period: {start.strftime('%Y-%m-%d')} to {end.strftime('%Y-%m-%d')} ({timeframe})"
    ], style={'color': '#007bff', 'fontWeight': 'bold', 'padding': '1rem', 
             'backgroundColor': '#f8f9fa', 'borderRadius': '6px'})
    
    # Run in async context
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        results = loop.run_until_complete(
            engine.backtest_strategy(
                strategy_class=strategy_class,
                pairs=pairs,
                start_date=start,
                end_date=end,
                lookback_period=20,  # Default params
                entry_threshold=2.0,
                exit_threshold=0.5
            )
        )
        
        # Cleanup
        loop.run_until_complete(engine.close())
        
    except Exception as e:
        loop.close()
        error_msg = html.Div([
            html.H3("❌ Backtest Error"),
            html.P(f"Error: {str(e)}"),
            html.P("This might be due to:"),
            html.Ul([
                html.Li("Network connection issues"),
                html.Li("API rate limits"),
                html.Li("Missing API keys (set KRAKEN_API_KEY, CRYPTOCOMPARE_API_KEY)"),
                html.Li("Invalid date range or pair")
            ]),
            html.P("Try using simulated data or check your configuration.")
        ], style={'color': 'red', 'padding': '1rem', 'backgroundColor': '#fff5f5', 
                 'borderRadius': '6px', 'border': '1px solid #fed7d7'})
        
        return error_msg, "", data_status
        
    finally:
        loop.close()
    
    # Create results display
    results_layout = create_results_layout(results, strategy_name, pairs, data_source, timeframe)
    
    # Store results for potential export
    results_json = {
        'strategy': strategy_name,
        'data_source': data_source,
        'timeframe': timeframe,
        'pairs': pairs,
        'initial_capital': initial_capital,
        'final_capital': results.final_capital,
        'total_return': results.total_return,
        'total_return_pct': results.total_return_pct,
        'sharpe_ratio': results.sharpe_ratio,
        'max_drawdown_pct': results.max_drawdown_pct,
        'total_trades': results.total_trades,
        'win_rate': results.win_rate,
        'start_date': start_date,
        'end_date': end_date
    }
    
    # Success status
    success_status = html.Div([
        html.Span("✅ "),
        f"Backtest completed successfully with {'real' if use_real_data else 'simulated'} data",
        html.Br(),
        f"Generated {results.total_trades} trades over {results.trading_days} trading days"
    ], style={'color': '#28a745', 'fontWeight': 'bold', 'padding': '1rem', 
             'backgroundColor': '#f8fff9', 'borderRadius': '6px'})
    
    return results_layout, json.dumps(results_json), success_status


def create_results_layout(results: BacktestResult, strategy_name: str, pairs: List[str], data_source: str, timeframe: str) -> html.Div:
    """Create the results display layout"""
    
    return html.Div([
        # Performance Summary
        html.Div([
            html.H2("📊 Performance Summary"),
            html.H3(f"{strategy_name} Strategy - {', '.join(pairs)}", 
                   style={'color': '#666', 'fontSize': '1.2rem'}),
            html.P([
                html.Span("📊 " if data_source == 'real' else "🎲 "),
                f"Data: {'Real Historical' if data_source == 'real' else 'Simulated'} ({timeframe})"
            ], style={'color': '#007bff', 'fontSize': '1rem', 'marginBottom': '1rem'}),
            
            # Key metrics grid
            html.Div([
                create_metric_card("Total Return", f"${results.total_return:,.2f}", 
                                 f"{results.total_return_pct:.1%}", results.total_return >= 0),
                create_metric_card("Final Capital", f"${results.final_capital:,.2f}", 
                                 f"from ${results.initial_capital:,.0f}", True),
                create_metric_card("Sharpe Ratio", f"{results.sharpe_ratio:.2f}", 
                                 "risk-adjusted returns", results.sharpe_ratio > 1),
                create_metric_card("Max Drawdown", f"{results.max_drawdown_pct:.1%}", 
                                 "peak to trough", results.max_drawdown_pct > -0.2),
                create_metric_card("Win Rate", f"{results.win_rate:.1%}", 
                                 f"{results.winning_trades}/{results.total_trades} trades", 
                                 results.win_rate > 0.5),
                create_metric_card("Profit Factor", f"{results.profit_factor:.2f}", 
                                 "gross profit/loss", results.profit_factor > 1),
            ], style={'display': 'grid', 'gridTemplateColumns': 'repeat(auto-fit, minmax(200px, 1fr))', 
                     'gap': '1rem', 'marginTop': '1rem'}),
        ], className='card'),
        
        # Equity Curve
        html.Div([
            html.H2("💰 Equity Curve"),
            dcc.Graph(
                figure=create_equity_curve_chart(results),
                config={'displayModeBar': False}
            )
        ], className='card'),
        
        # Trade Analysis
        html.Div([
            html.H2("📈 Trade Analysis"),
            html.Div([
                html.Div([
                    dcc.Graph(
                        figure=create_trade_distribution_chart(results),
                        config={'displayModeBar': False}
                    )
                ], style={'flex': 1}),
                
                html.Div([
                    dcc.Graph(
                        figure=create_monthly_returns_chart(results),
                        config={'displayModeBar': False}
                    )
                ], style={'flex': 1}),
            ], style={'display': 'flex', 'gap': '2rem'}),
        ], className='card'),
        
        # Risk Metrics
        html.Div([
            html.H2("⚠️ Risk Analysis"),
            html.Div([
                create_metric_card("Volatility", f"{results.volatility:.1%}", 
                                 "annualized", results.volatility < 0.3),
                create_metric_card("Sortino Ratio", f"{results.sortino_ratio:.2f}", 
                                 "downside risk", results.sortino_ratio > 1),
                create_metric_card("Value at Risk", f"{results.var_95:.2%}", 
                                 "95% confidence", results.var_95 > -0.05),
                create_metric_card("Calmar Ratio", f"{results.calmar_ratio:.2f}", 
                                 "return/drawdown", results.calmar_ratio > 1),
            ], style={'display': 'grid', 'gridTemplateColumns': 'repeat(auto-fit, minmax(200px, 1fr))', 
                     'gap': '1rem'}),
        ], className='card'),
        
        # Trade Details Table
        html.Div([
            html.H2("🔍 Recent Trades"),
            create_trades_table(results.trades[-20:])  # Show last 20 trades
        ], className='card'),
        
        # Export Button
        html.Div([
            html.Button("📥 Export Results", id='export-results', 
                       style={'background': '#059669', 'color': 'white', 'border': 'none',
                             'padding': '0.75rem 1.5rem', 'borderRadius': '6px', 
                             'fontSize': '1rem', 'cursor': 'pointer'}),
            dcc.Download(id="download-results")
        ], style={'textAlign': 'center', 'marginTop': '2rem'})
    ])


def create_metric_card(label: str, value: str, subtitle: str, is_positive: bool) -> html.Div:
    """Create a metric display card"""
    return html.Div([
        html.Div(label, className='metric-label'),
        html.Div(value, className=f'metric-value {"positive" if is_positive else "negative"}'),
        html.Div(subtitle, style={'fontSize': '0.8rem', 'color': '#999'})
    ], className='metric-card')


def create_equity_curve_chart(results: BacktestResult) -> go.Figure:
    """Create equity curve chart"""
    fig = go.Figure()
    
    # Add equity curve
    fig.add_trace(go.Scatter(
        x=results.equity_curve.index,
        y=results.equity_curve['equity'],
        mode='lines',
        name='Portfolio Value',
        line=dict(color='#667eea', width=2),
        fill='tozeroy',
        fillcolor='rgba(102, 126, 234, 0.1)'
    ))
    
    # Add initial capital line
    fig.add_hline(y=results.initial_capital, line_dash="dash", 
                  line_color="gray", opacity=0.5,
                  annotation_text="Initial Capital")
    
    # Highlight drawdowns
    equity = results.equity_curve['equity']
    running_max = equity.expanding().max()
    drawdown = (equity - running_max) / running_max
    
    # Find drawdown periods
    in_drawdown = drawdown < -0.05  # 5% drawdown threshold
    
    for i in range(len(in_drawdown)):
        if in_drawdown.iloc[i]:
            fig.add_vrect(
                x0=equity.index[i], x1=equity.index[min(i+1, len(equity)-1)],
                fillcolor="red", opacity=0.1, line_width=0
            )
    
    fig.update_layout(
        title="Portfolio Equity Curve",
        xaxis_title="Date",
        yaxis_title="Portfolio Value ($)",
        hovermode='x unified',
        height=400,
        template='plotly_white'
    )
    
    return fig


def create_trade_distribution_chart(results: BacktestResult) -> go.Figure:
    """Create trade P&L distribution chart"""
    trade_pnls = [t.pnl for t in results.trades if t.pnl != 0]
    
    fig = go.Figure()
    
    fig.add_trace(go.Histogram(
        x=trade_pnls,
        nbinsx=30,
        name='Trade P&L',
        marker_color='#764ba2',
        opacity=0.7
    ))
    
    # Add average line
    avg_pnl = np.mean(trade_pnls) if trade_pnls else 0
    fig.add_vline(x=avg_pnl, line_dash="dash", 
                  line_color="orange", opacity=0.8,
                  annotation_text=f"Avg: ${avg_pnl:.2f}")
    
    fig.update_layout(
        title="Trade P&L Distribution",
        xaxis_title="P&L ($)",
        yaxis_title="Frequency",
        height=350,
        template='plotly_white'
    )
    
    return fig


def create_monthly_returns_chart(results: BacktestResult) -> go.Figure:
    """Create monthly returns heatmap"""
    # Calculate monthly returns
    monthly_returns = results.daily_returns.resample('M').apply(lambda x: (1 + x).prod() - 1)
    
    # Reshape for heatmap
    returns_pivot = pd.DataFrame({
        'Year': monthly_returns.index.year,
        'Month': monthly_returns.index.month_name().str[:3],
        'Return': monthly_returns.values * 100  # Convert to percentage
    })
    
    # Create pivot table
    pivot = returns_pivot.pivot_table(values='Return', index='Month', columns='Year', aggfunc='first')
    
    # Ensure months are in correct order
    month_order = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    pivot = pivot.reindex([m for m in month_order if m in pivot.index])
    
    fig = go.Figure(data=go.Heatmap(
        z=pivot.values,
        x=pivot.columns,
        y=pivot.index,
        colorscale='RdYlGn',
        zmid=0,
        text=np.round(pivot.values, 1),
        texttemplate='%{text}%',
        textfont={"size": 10},
        hoverongaps=False
    ))
    
    fig.update_layout(
        title="Monthly Returns (%)",
        height=350,
        template='plotly_white'
    )
    
    return fig


def create_trades_table(trades: List) -> dash_table.DataTable:
    """Create trades detail table"""
    
    # Convert trades to dataframe
    trades_data = []
    for trade in trades:
        trades_data.append({
            'Time': trade.timestamp.strftime('%Y-%m-%d %H:%M'),
            'Pair': trade.pair,
            'Side': trade.side.upper(),
            'Volume': f"{trade.volume:.6f}",
            'Price': f"${trade.price:,.2f}",
            'Fee': f"${trade.fee:.2f}",
            'P&L': f"${trade.pnl:.2f}"
        })
    
    return dash_table.DataTable(
        data=trades_data,
        columns=[{"name": i, "id": i} for i in trades_data[0].keys()] if trades_data else [],
        style_cell={
            'textAlign': 'left',
            'padding': '10px',
            'fontFamily': 'system-ui'
        },
        style_header={
            'backgroundColor': '#f8f9fa',
            'fontWeight': 'bold'
        },
        style_data_conditional=[
            {
                'if': {'column_id': 'Side', 'filter_query': '{Side} = BUY'},
                'color': '#10b981'
            },
            {
                'if': {'column_id': 'Side', 'filter_query': '{Side} = SELL'},
                'color': '#ef4444'
            },
            {
                'if': {'column_id': 'P&L', 'filter_query': '{P&L} contains -'},
                'color': '#ef4444'
            },
            {
                'if': {'column_id': 'P&L', 'filter_query': '{P&L} !contains -'},
                'color': '#10b981'
            }
        ],
        page_size=10
    )


@app.callback(
    Output("download-results", "data"),
    Input("export-results", "n_clicks"),
    State("results-store", "children"),
    prevent_initial_call=True
)
def export_results(n_clicks, results_json):
    """Export backtest results"""
    if results_json:
        results = json.loads(results_json)
        filename = f"backtest_{results['strategy']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        return dict(content=results_json, filename=filename)
    return None


if __name__ == '__main__':
    app.run_server(debug=True, port=8050)