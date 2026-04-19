import { useState, useMemo } from 'react';

const PAGE_SIZE = 15;

const PaginatedList = ({
	items,
	columns,
	filterFields,
	initialSortField = null,
	initialSortDir = 'asc',
	renderRow
}) => {
	const [search, setSearch] = useState('');
	const [page, setPage] = useState(1);
	const [sortField, setSortField] = useState(initialSortField);
	const [sortDir, setSortDir] = useState(initialSortDir);

	const filtered = useMemo(() => {
		if (!search) return items;
		const lower = search.toLowerCase();
		return items.filter(item =>
			filterFields.some(field =>
				String(item[field] ?? '').toLowerCase().includes(lower)
			)
		);
	}, [items, search, filterFields]);

	const sorted = useMemo(() => {
		if (!sortField) return filtered;
		const copy = [...filtered];
		copy.sort((a, b) => {
			const av = a[sortField];
			const bv = b[sortField];
			if (av == null && bv == null) return 0;
			if (av == null) return 1;
			if (bv == null) return -1;
			if (typeof av === 'number' && typeof bv === 'number') return av - bv;
			return String(av).localeCompare(String(bv));
		});
		return sortDir === 'asc' ? copy : copy.reverse();
	}, [filtered, sortField, sortDir]);

	const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const start = (currentPage - 1) * PAGE_SIZE;
	const visible = sorted.slice(start, start + PAGE_SIZE);

	const handleSearch = (value) => {
		setSearch(value);
		setPage(1);
	};

	const handleSort = (field) => {
		if (!field) return;
		if (sortField === field) {
			setSortDir(d => d === 'asc' ? 'desc' : 'asc');
		} else {
			setSortField(field);
			setSortDir('asc');
		}
		setPage(1);
	};

	return (
		<>
			<div className="admin-list-controls">
				<input
					type="text"
					placeholder="Search..."
					value={search}
					onChange={e => handleSearch(e.target.value)}
					className="admin-search"
				/>
				<span className="admin-list-count">
					{sorted.length} {sorted.length === 1 ? 'result' : 'results'}
				</span>
			</div>

			<table className="admin-table">
				<thead>
					<tr>
						{columns.map(col => (
							<th
								key={col.label}
								onClick={() => handleSort(col.sortField)}
								className={col.sortField ? 'admin-th-sortable' : ''}
							>
								{col.label}
								{sortField === col.sortField && (
									<span className="admin-sort-indicator">
										{sortDir === 'asc' ? ' ▲' : ' ▼'}
									</span>
								)}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{visible.map(renderRow)}
				</tbody>
			</table>

			{totalPages > 1 && (
				<div className="admin-pagination">
					<button
						className="admin-btn admin-btn-secondary"
						onClick={() => setPage(p => Math.max(1, p - 1))}
						disabled={currentPage === 1}
					>
						Previous
					</button>
					<span>Page {currentPage} of {totalPages}</span>
					<button
						className="admin-btn admin-btn-secondary"
						onClick={() => setPage(p => Math.min(totalPages, p + 1))}
						disabled={currentPage === totalPages}
					>
						Next
					</button>
				</div>
			)}
		</>
	);
};

export default PaginatedList;