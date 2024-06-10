// MODAL SUPORTE
var abrirModal = document.querySelector("#abrirModal")
var fade = document.querySelector("#fade")
var modal = document.querySelector("#modal")
var fechar = document.querySelector('#fechar')

var eventos = [abrirModal,fade,fechar]

let toogleModal = ()=>{
    modal.classList.toggle('hide')
    fade.classList.toggle('hide')
}

eventos.map((el)=>{
    el.addEventListener("click", () => toogleModal())
})

// LOGOUT

function confirmLogout() {
    if (confirm("Você realmente quer sair?")) {
      window.location.href = "/logout";
    }
  }

// FORM LEMBRETES

function searchMedicamentos() {
    const searchTerm = document.getElementById('searchMedicamento').value;
    if (searchTerm.length >= 3) {
        fetch(`/api/medicamentos?q=${searchTerm}`)
            .then(response => response.json())
            .then(data => {
                const resultadosPesquisa = document.getElementById('resultadosPesquisa');
                resultadosPesquisa.innerHTML = ''; // Limpa os resultados anteriores
                data.forEach(medicamento => {
                    const listItem = document.createElement('li');
                    listItem.textContent = medicamento.NOME_PRODUTO;
                    listItem.onclick = () => {
                        // Adicione o nome do medicamento clicado ao campo de entrada de texto
                        document.getElementById('searchMedicamento').value = medicamento.NOME_PRODUTO;
                        resultadosPesquisa.innerHTML = ''; // Limpa os resultados da pesquisa
                    };
                    resultadosPesquisa.appendChild(listItem);
                });
            })
            .catch(error => {
                console.error('Erro ao buscar medicamentos:', error);
            });
    }
}

document.getElementById('formAddLembrete').addEventListener('submit', function(event) {
    event.preventDefault(); // Impede o envio padrão do formulário

    // Obtém os valores dos campos do formulário
    const nomeMedicamento = document.getElementById('searchMedicamento').value;
    const frequencia = document.querySelector('input[name="frequencia"]:checked').value;
    const horario = document.getElementById('horario').value;
    const dose = document.getElementById('dose').value;

    // Cria um objeto com os dados do lembrete
    const lembreteData = {
        nomeMedicamento: nomeMedicamento,
        frequencia: frequencia,
        horario: horario,
        dose: dose
    };

    // Envia os dados para o servidor usando fetch API
    fetch('/api/lembretes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(lembreteData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao adicionar lembrete');
        }
        // Redireciona para a página "tratamento" após o sucesso
        window.location.href = '/tratamento';
    })
    .catch(error => {
        console.error('Erro ao adicionar lembrete:', error);
        // Lida com erros de forma apropriada (exibindo uma mensagem de erro, por exemplo)
    });
});

// ALERTA LEMBRETES



  