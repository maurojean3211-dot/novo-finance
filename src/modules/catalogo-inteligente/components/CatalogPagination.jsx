export default function CatalogPagination({ page, pageCount, total, onPageChange }) {
  return (
    <footer className="catalog-pagination">
      <span>{total} resultado{total === 1 ? "" : "s"}</span>
      <div><button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>←</button><strong>{page} de {pageCount}</strong><button onClick={() => onPageChange(Math.min(pageCount, page + 1))} disabled={page === pageCount}>→</button></div>
    </footer>
  );
}
