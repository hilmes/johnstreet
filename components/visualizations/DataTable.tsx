'use client'

import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box
} from '@mui/material'
import { DesignSystem } from '@/lib/design'
import Sparkline from './Sparkline'

interface Column {
  id: string
  label: string
  align?: 'left' | 'center' | 'right'
  format?: (value: any) => string | React.ReactNode
  width?: string | number
  sparkline?: boolean // If true, expects array data for sparkline
}

interface DataTableProps {
  columns: Column[]
  data: any[]
  dense?: boolean
  stickyHeader?: boolean
  maxHeight?: number | string
  onRowClick?: (row: any) => void
  getRowId?: (row: any) => string | number
  highlightRow?: (row: any) => boolean
}

function DataTable({
  columns,
  data,
  dense = false,
  stickyHeader = true,
  maxHeight,
  onRowClick,
  getRowId,
  highlightRow
}: DataTableProps) {
  return (
    <TableContainer 
      className="data-table-container"
      sx={{ 
        maxHeight,
        '&::-webkit-scrollbar': {
          width: 8,
          height: 8,
        },
        '&::-webkit-scrollbar-track': {
          background: DesignSystem.colors.background.primary,
        },
        '&::-webkit-scrollbar-thumb': {
          background: DesignSystem.colors.neutral[400],
          borderRadius: 4,
          '&:hover': {
            background: DesignSystem.colors.neutral[500],
          }
        }
      }}
    >
      <Table 
        className="data-table" 
        size={dense ? 'small' : 'medium'}
        stickyHeader={stickyHeader}
        sx={{
          borderCollapse: 'collapse',
          '& .MuiTableCell-root': {
            fontFamily: DesignSystem.typography.fonts.secondary,
            fontSize: dense ? '0.75rem' : '0.875rem',
            lineHeight: 1.5,
            borderBottom: `1px solid ${DesignSystem.colors.neutral[200]}`,
            padding: dense ? '8px 12px' : '12px 16px',
          }
        }}
      >
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align || 'left'}
                style={{ width: column.width }}
                sx={{
                  fontFamily: `${DesignSystem.typography.fonts.primary} !important`,
                  fontWeight: DesignSystem.typography.weights.semibold,
                  fontSize: '0.75rem !important',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: DesignSystem.colors.neutral[600],
                  backgroundColor: stickyHeader ? DesignSystem.colors.background.primary : 'transparent',
                  borderBottom: `2px solid ${DesignSystem.colors.neutral[300]} !important`,
                }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, rowIndex) => {
            const rowId = getRowId ? getRowId(row) : rowIndex
            const isHighlighted = highlightRow ? highlightRow(row) : false

            return (
              <TableRow
                key={rowId}
                onClick={() => onRowClick?.(row)}
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  backgroundColor: isHighlighted 
                    ? DesignSystem.colors.neutral[100] 
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: DesignSystem.colors.background.tertiary,
                  },
                  transition: 'background-color 200ms ease',
                }}
              >
                {columns.map((column) => {
                  const value = row[column.id]
                  const formattedValue = column.format ? column.format(value) : value

                  return (
                    <TableCell
                      key={column.id}
                      align={column.align || 'left'}
                      sx={{
                        color: DesignSystem.colors.neutral.black,
                      }}
                    >
                      {column.sparkline && Array.isArray(value) ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Sparkline 
                            data={value} 
                            width={60} 
                            height={20}
                            color={
                              value[value.length - 1] > value[0] 
                                ? DesignSystem.colors.market.up 
                                : DesignSystem.colors.market.down
                            }
                          />
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontFamily: DesignSystem.typography.fonts.secondary,
                              color: value[value.length - 1] > value[0] 
                                ? DesignSystem.colors.market.up 
                                : DesignSystem.colors.market.down,
                              fontWeight: DesignSystem.typography.weights.medium
                            }}
                          >
                            {column.format ? column.format(value[value.length - 1]) : value[value.length - 1]}
                          </Typography>
                        </Box>
                      ) : (
                        formattedValue
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default DataTable

// Re-export variants
export { TradesTable, PositionsTable, OrdersTable, AnalyticsTable } from './DataTableVariants'